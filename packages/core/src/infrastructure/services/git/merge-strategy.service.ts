import { injectable, inject } from 'tsyringe';
import type {
  MergeStrategy,
  IMergeStrategyService,
} from '../../../application/ports/output/services/git-pr-service.interface.js';
import {
  GitPrError,
  GitPrErrorCode,
} from '../../../application/ports/output/services/git-pr-service.interface.js';
import type { ExecFunction } from './worktree.service.js';
import { parseGitError } from './git-error-utils.js';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

@injectable()
export class MergeStrategyService implements IMergeStrategyService {
  constructor(@inject('ExecFunction') private readonly execFile: ExecFunction) {}

  async mergePr(cwd: string, prNumber: number, strategy: MergeStrategy = 'squash'): Promise<void> {
    try {
      await this.execFile('gh', ['pr', 'merge', String(prNumber), `--${strategy}`], {
        cwd,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const cause = error instanceof Error ? error : undefined;
      throw new GitPrError(message, GitPrErrorCode.MERGE_FAILED, cause);
    }

    // Try to delete the remote branch gracefully — not fatal if it fails
    // (e.g. branch already deleted by GitHub auto-delete, or permissions)
    try {
      await this.execFile(
        'gh',
        [
          'api',
          '--method',
          'DELETE',
          `repos/{owner}/{repo}/git/refs/heads/${await this.getPrHeadBranch(cwd, prNumber)}`,
        ],
        { cwd }
      );
    } catch {
      // Branch deletion is best-effort — log-level concern, not an error
    }
  }

  private async getPrHeadBranch(cwd: string, prNumber: number): Promise<string> {
    const { stdout } = await this.execFile(
      'gh',
      ['pr', 'view', String(prNumber), '--json', 'headRefName', '--jq', '.headRefName'],
      { cwd }
    );
    return stdout.trim();
  }

  async localMergeSquash(
    cwd: string,
    featureBranch: string,
    baseBranch: string,
    commitMessage: string,
    hasRemote = false
  ): Promise<void> {
    try {
      // Fetch latest from remote if available
      if (hasRemote) {
        try {
          await this.execFile('git', ['fetch', 'origin'], { cwd });
        } catch {
          // Fetch failure is non-fatal — proceed with local state
        }
      }

      // Checkout base branch
      await this.execFile('git', ['checkout', baseBranch], { cwd });

      // Pull latest base if remote available
      if (hasRemote) {
        try {
          await this.execFile('git', ['pull', 'origin', baseBranch], { cwd });
        } catch {
          // Pull failure is non-fatal — proceed with local state
        }
      }

      // Clean untracked files that may conflict with the merge (e.g. files created
      // by a prior agent call that leaked into the original repo directory)
      try {
        await this.execFile('git', ['clean', '-fd'], { cwd });
      } catch {
        // Clean failure is non-fatal
      }

      // Squash merge the feature branch
      await this.execFile('git', ['merge', '--squash', featureBranch], { cwd });

      // Commit the squash merge (skip if nothing to commit — branches may be equivalent)
      const { stdout: status } = await this.execFile('git', ['status', '--porcelain'], { cwd });
      if (status.trim().length > 0) {
        // Write commit message to a temp file to avoid shell splitting on Windows
        // (DI-injected execFile uses shell: true on Windows, which splits on spaces)
        const msgFile = join(tmpdir(), `shep-merge-msg-${Date.now()}.txt`);
        try {
          writeFileSync(msgFile, commitMessage, 'utf8');
          await this.execFile('git', ['commit', '--file', msgFile], { cwd });
        } finally {
          try {
            unlinkSync(msgFile);
          } catch {
            // Cleanup failure is non-fatal
          }
        }
      }

      // Delete the feature branch after successful merge
      try {
        await this.execFile('git', ['branch', '-d', featureBranch], { cwd });
      } catch {
        // Branch deletion failure is non-fatal (branch may have already been deleted)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const cause = error instanceof Error ? error : undefined;
      if (message.includes('CONFLICT') || message.includes('conflict')) {
        throw new GitPrError(
          `Merge conflict while squash-merging ${featureBranch} into ${baseBranch}: ${message}`,
          GitPrErrorCode.MERGE_CONFLICT,
          cause
        );
      }
      throw new GitPrError(
        `Local squash merge failed: ${message}`,
        GitPrErrorCode.GIT_ERROR,
        cause
      );
    }
  }

  async mergeBranch(cwd: string, sourceBranch: string, targetBranch: string): Promise<void> {
    try {
      await this.execFile('git', ['checkout', targetBranch], { cwd });
      await this.execFile('git', ['merge', sourceBranch], { cwd });
      await this.execFile('git', ['push'], { cwd });
    } catch (error) {
      throw parseGitError(error);
    }
  }

  async verifyMerge(
    cwd: string,
    featureBranch: string,
    baseBranch: string,
    premergeBaseSha?: string
  ): Promise<boolean> {
    // Resolve the feature branch ref — the local branch may have been deleted
    // after a squash merge (git branch -d succeeds when pushed to remote).
    // Fall back to the remote tracking branch if the local ref is gone.
    const resolvedRef = await this.resolveRef(cwd, featureBranch);
    if (!resolvedRef) return false;

    // First try: true merge (feature branch is ancestor of base)
    try {
      await this.execFile('git', ['merge-base', '--is-ancestor', resolvedRef, baseBranch], {
        cwd,
      });
      return true;
    } catch {
      // Not a true merge — check for squash merge by comparing tree content.
      // After a squash merge, all changes from the feature branch are on the base
      // branch, so `git diff featureBranch baseBranch` should produce no output.
    }

    try {
      await this.execFile('git', ['diff', '--quiet', resolvedRef, baseBranch], { cwd });
      // --quiet exits 0 when there's no diff → squash merge verified
      return true;
    } catch {
      // Exit code 1 = diff exists (not merged), other errors also mean unverified.
      // Fall through to premergeBaseSha check if available.
    }

    // Third fallback: if the caller recorded the base branch HEAD before the merge
    // agent ran, check whether it advanced. This handles agents that legitimately
    // modify the tree during squash merge (e.g. adding .gitignore, removing
    // node_modules). If baseBranch HEAD moved forward, the agent committed something.
    if (premergeBaseSha) {
      try {
        const { stdout } = await this.execFile('git', ['rev-parse', baseBranch], { cwd });
        const currentSha = stdout.trim();
        return currentSha !== premergeBaseSha;
      } catch {
        return false;
      }
    }

    return false;
  }

  async syncMain(cwd: string, baseBranch: string): Promise<void> {
    try {
      // Detect current branch
      const { stdout } = await this.execFile('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd });
      const currentBranch = stdout.trim();

      if (currentBranch === baseBranch) {
        // On the base branch — use git pull --ff-only
        await this.execFile('git', ['pull', '--ff-only', 'origin', baseBranch], { cwd });
      } else {
        // On a different branch — fetch the remote ref only (updates origin/<baseBranch>).
        // We intentionally do NOT update the local <baseBranch> ref because it may be
        // checked out in another worktree, which causes git to refuse the update with:
        //   "fatal: refusing to fetch into branch 'refs/heads/main' checked out at ..."
        await this.execFile('git', ['fetch', 'origin', baseBranch], { cwd });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const cause = error instanceof Error ? error : undefined;

      if (
        message.includes('non-fast-forward') ||
        message.includes('Not possible to fast-forward') ||
        message.includes('diverged')
      ) {
        throw new GitPrError(
          `Cannot fast-forward '${baseBranch}': local branch has diverged from remote. ` +
            `Resolve the divergence manually with 'git checkout ${baseBranch} && git reset --hard origin/${baseBranch}' ` +
            `if you want to discard local changes on ${baseBranch}.`,
          GitPrErrorCode.SYNC_FAILED,
          cause
        );
      }

      throw new GitPrError(
        `Failed to sync '${baseBranch}' with remote: ${message}`,
        GitPrErrorCode.GIT_ERROR,
        cause
      );
    }
  }

  async rebaseOnMain(cwd: string, featureBranch: string, baseBranch: string): Promise<void> {
    // Check for dirty worktree before starting
    const { stdout: statusOut } = await this.execFile('git', ['status', '--porcelain'], { cwd });
    const dirty = statusOut.trim().length > 0;
    if (dirty) {
      throw new GitPrError(
        `Cannot rebase: working directory has uncommitted changes. ` +
          `Please commit or stash your changes before rebasing.`,
        GitPrErrorCode.GIT_ERROR
      );
    }

    // Checkout the feature branch
    try {
      await this.execFile('git', ['checkout', featureBranch], { cwd });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const cause = error instanceof Error ? error : undefined;
      if (
        message.includes('did not match') ||
        message.includes('not a commit') ||
        message.includes('pathspec')
      ) {
        throw new GitPrError(
          `Branch '${featureBranch}' not found.`,
          GitPrErrorCode.BRANCH_NOT_FOUND,
          cause
        );
      }
      throw new GitPrError(
        `Failed to checkout '${featureBranch}': ${message}`,
        GitPrErrorCode.GIT_ERROR,
        cause
      );
    }

    // Rebase onto origin/<baseBranch> (the remote-tracking ref).
    // We use origin/<baseBranch> rather than the local <baseBranch> because:
    // 1. syncMain fetches origin/<baseBranch> — it's always up-to-date
    // 2. The local <baseBranch> may be checked out in another worktree and stale
    const rebaseTarget = `origin/${baseBranch}`;
    try {
      await this.execFile('git', ['rebase', rebaseTarget], { cwd });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const cause = error instanceof Error ? error : undefined;

      // Detect rebase conflict from git stderr/exit code
      if (message.includes('CONFLICT') || message.includes('could not apply')) {
        // Get the list of conflicted files to include in the error message
        let conflictedFiles: string[] = [];
        try {
          conflictedFiles = await this.getConflictedFiles(cwd);
        } catch {
          // Failed to get conflicted files — still report the conflict
        }

        const fileList =
          conflictedFiles.length > 0 ? ` Conflicted files: ${conflictedFiles.join(', ')}` : '';
        throw new GitPrError(
          `Rebase of '${featureBranch}' onto '${baseBranch}' encountered conflicts.${fileList}`,
          GitPrErrorCode.REBASE_CONFLICT,
          cause
        );
      }

      throw new GitPrError(
        `Rebase of '${featureBranch}' onto '${baseBranch}' failed: ${message}`,
        GitPrErrorCode.GIT_ERROR,
        cause
      );
    }
  }

  async getConflictedFiles(cwd: string): Promise<string[]> {
    try {
      const { stdout } = await this.execFile('git', ['diff', '--name-only', '--diff-filter=U'], {
        cwd,
      });
      return stdout
        .trim()
        .split('\n')
        .filter((f) => f.length > 0)
        .map((f) => f.replace(/\\/g, '/'));
    } catch (error) {
      throw parseGitError(error);
    }
  }

  async stageFiles(cwd: string, files: string[]): Promise<void> {
    try {
      await this.execFile('git', ['add', ...files], { cwd });
    } catch (error) {
      throw parseGitError(error);
    }
  }

  async rebaseContinue(cwd: string): Promise<void> {
    try {
      await this.execFile('git', ['rebase', '--continue'], {
        cwd,
        env: { ...process.env, GIT_EDITOR: 'true' },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const cause = error instanceof Error ? error : undefined;

      if (message.includes('CONFLICT') || message.includes('could not apply')) {
        throw new GitPrError(
          `Rebase continue encountered new conflicts: ${message}`,
          GitPrErrorCode.REBASE_CONFLICT,
          cause
        );
      }
      throw parseGitError(error);
    }
  }

  async rebaseAbort(cwd: string): Promise<void> {
    try {
      await this.execFile('git', ['rebase', '--abort'], { cwd });
    } catch (error) {
      throw parseGitError(error);
    }
  }

  async stash(cwd: string, message?: string): Promise<boolean> {
    try {
      const args = ['stash', 'push'];
      if (message) {
        args.push('-m', message);
      }
      const { stdout } = await this.execFile('git', args, { cwd });
      // git stash push outputs "No local changes to save" when clean
      return !stdout.includes('No local changes to save');
    } catch (error) {
      throw parseGitError(error);
    }
  }

  async stashPop(cwd: string): Promise<void> {
    try {
      await this.execFile('git', ['stash', 'pop'], { cwd });
    } catch (error) {
      throw parseGitError(error);
    }
  }

  private async resolveRef(cwd: string, branch: string): Promise<string | null> {
    // Try local ref first
    try {
      await this.execFile('git', ['rev-parse', '--verify', branch], { cwd });
      return branch;
    } catch {
      // Local ref doesn't exist
    }

    // Try remote tracking branch
    const remoteRef = `origin/${branch}`;
    try {
      await this.execFile('git', ['rev-parse', '--verify', remoteRef], { cwd });
      return remoteRef;
    } catch {
      return null;
    }
  }
}
