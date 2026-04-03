import { injectable, inject } from 'tsyringe';
import type { IBranchDiscoveryService } from '../../../application/ports/output/services/git-pr-service.interface.js';
import type { ExecFunction } from './worktree.service.js';
import { parseGitError } from './git-error-utils.js';

@injectable()
export class BranchDiscoveryService implements IBranchDiscoveryService {
  constructor(@inject('ExecFunction') private readonly execFile: ExecFunction) {}

  async hasRemote(cwd: string): Promise<boolean> {
    const { stdout } = await this.execFile('git', ['remote'], { cwd });
    return stdout.trim().length > 0;
  }

  async getRemoteUrl(cwd: string): Promise<string | null> {
    try {
      const { stdout } = await this.execFile('git', ['remote', 'get-url', 'origin'], { cwd });
      const raw = stdout.trim();
      if (!raw) return null;
      // Convert SSH URLs to HTTPS: git@github.com:org/repo.git → https://github.com/org/repo
      if (raw.startsWith('git@')) {
        return raw.replace(/^git@([^:]+):/, 'https://$1/').replace(/\.git$/, '');
      }
      // Strip trailing .git from HTTPS URLs
      return raw.replace(/\.git$/, '');
    } catch {
      return null;
    }
  }

  async getDefaultBranch(cwd: string): Promise<string> {
    // 1. Try remote HEAD reference (most reliable when remote exists)
    try {
      const { stdout } = await this.execFile('git', ['symbolic-ref', 'refs/remotes/origin/HEAD'], {
        cwd,
      });
      const ref = stdout.trim(); // e.g. "refs/remotes/origin/main"
      if (ref) return ref.replace('refs/remotes/origin/', '');
    } catch {
      // No remote HEAD configured — continue to fallbacks
    }

    // 2. Check for common default branch names locally.
    //    If both exist, pick the one with the most recent commit.
    const candidates: string[] = [];
    for (const name of ['main', 'master']) {
      try {
        const { stdout } = await this.execFile(
          'git',
          ['rev-parse', '--verify', `refs/heads/${name}`],
          { cwd }
        );
        if (stdout.trim()) candidates.push(name);
      } catch {
        // Branch doesn't exist — try next
      }
    }
    if (candidates.length === 1) return candidates[0];
    if (candidates.length > 1) {
      // Pick the branch with the most recent commit
      try {
        const { stdout } = await this.execFile(
          'git',
          [
            'for-each-ref',
            '--sort=-committerdate',
            '--format=%(refname:short)',
            ...candidates.map((c) => `refs/heads/${c}`),
          ],
          { cwd }
        );
        const newest = stdout.trim().split('\n')[0];
        if (newest) return newest;
      } catch {
        // Fall through to first candidate
      }
      return candidates[0];
    }

    // 3. Check git config init.defaultBranch (user/system-level default)
    try {
      const { stdout } = await this.execFile('git', ['config', 'init.defaultBranch'], { cwd });
      const configured = stdout.trim();
      if (configured) return configured;
    } catch {
      // Not configured — continue
    }

    // 4. Fall back to current branch ONLY in the main worktree (not feature worktrees).
    // In a feature worktree, symbolic-ref HEAD returns the feature branch, not the default.
    try {
      const gitDir = await this.execFile('git', ['rev-parse', '--git-dir'], { cwd });
      const gitCommonDir = await this.execFile('git', ['rev-parse', '--git-common-dir'], { cwd });
      const isMainWorktree = gitDir.stdout.trim() === gitCommonDir.stdout.trim();
      if (isMainWorktree) {
        const { stdout } = await this.execFile('git', ['symbolic-ref', '--short', 'HEAD'], { cwd });
        const branch = stdout.trim();
        if (branch) return branch;
      }
    } catch {
      // Detached HEAD or other error — continue
    }

    // 5. Ultimate fallback — throw instead of silently guessing
    throw new Error(
      `Unable to determine default branch for repository at ${cwd}. ` +
        `No remote HEAD, no main/master branch, and no init.defaultBranch configured.`
    );
  }

  async revParse(cwd: string, ref: string): Promise<string> {
    const { stdout } = await this.execFile('git', ['rev-parse', ref], { cwd });
    return stdout.trim();
  }

  async deleteBranch(cwd: string, branch: string, deleteRemote?: boolean): Promise<void> {
    try {
      await this.execFile('git', ['branch', '-d', branch], { cwd });
      if (deleteRemote) {
        await this.execFile('git', ['push', 'origin', '--delete', branch], { cwd });
      }
    } catch (error) {
      throw parseGitError(error);
    }
  }

  async getBranchSyncStatus(
    cwd: string,
    featureBranch: string,
    baseBranch: string
  ): Promise<{ ahead: number; behind: number }> {
    try {
      const remoteRef = `origin/${baseBranch}`;
      const [aheadResult, behindResult] = await Promise.all([
        this.execFile('git', ['rev-list', '--count', `${remoteRef}..${featureBranch}`], { cwd }),
        this.execFile('git', ['rev-list', '--count', `${featureBranch}..${remoteRef}`], { cwd }),
      ]);
      return {
        ahead: parseInt(aheadResult.stdout.trim(), 10) || 0,
        behind: parseInt(behindResult.stdout.trim(), 10) || 0,
      };
    } catch (error) {
      throw parseGitError(error);
    }
  }
}
