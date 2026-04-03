import { injectable, inject } from 'tsyringe';
import type {
  CiStatusResult,
  PrStatusInfo,
  ICiStatusService,
} from '../../../application/ports/output/services/git-pr-service.interface.js';
import {
  GitPrError,
  GitPrErrorCode,
} from '../../../application/ports/output/services/git-pr-service.interface.js';
import { PrStatus } from '../../../domain/generated/output.js';
import type { ExecFunction } from './worktree.service.js';
import { parseGhError } from './git-error-utils.js';

@injectable()
export class CiStatusService implements ICiStatusService {
  constructor(@inject('ExecFunction') private readonly execFile: ExecFunction) {}

  async getCiStatus(cwd: string, branch: string): Promise<CiStatusResult> {
    try {
      const { stdout } = await this.execFile(
        'gh',
        ['run', 'list', '--branch', branch, '--json', 'conclusion,url', '--limit', '1'],
        { cwd }
      );

      const runs = JSON.parse(stdout) as { conclusion: string | null; url: string }[];
      if (runs.length === 0 || !runs[0].conclusion) {
        return { status: 'pending', runUrl: runs[0]?.url };
      }

      return {
        status: runs[0].conclusion === 'success' ? 'success' : 'failure',
        runUrl: runs[0].url,
      };
    } catch (error) {
      throw parseGhError(error);
    }
  }

  async watchCi(
    cwd: string,
    branch: string,
    timeoutMs?: number,
    intervalSeconds?: number
  ): Promise<CiStatusResult> {
    // Resolve the latest run for the branch BEFORE the try/catch so the
    // runUrl is available in both success and failure return paths.
    let runUrl: string | undefined;
    try {
      // gh run watch requires a run ID — it does not support --branch.
      // First, resolve the latest run ID for the branch via gh run list.
      const { stdout: listOut } = await this.execFile(
        'gh',
        ['run', 'list', '--branch', branch, '--json', 'databaseId,url', '--limit', '1'],
        { cwd }
      );
      const runs = JSON.parse(listOut) as { databaseId: number; url: string }[];
      if (runs.length === 0 || !runs[0].databaseId) {
        return { status: 'pending' };
      }

      const runId = String(runs[0].databaseId);
      runUrl = runs[0].url;
      const interval = intervalSeconds ?? 30;
      const args = [
        'run',
        'watch',
        runId,
        '--exit-status',
        '--compact',
        '--interval',
        String(interval),
      ];
      const { stdout } = await this.execFile('gh', args, {
        cwd,
        ...(timeoutMs ? { timeout: timeoutMs } : {}),
      });

      // gh run watch --exit-status exits 0 when the run succeeds.
      // If we reach here (no exception), CI passed — no need for fragile stdout parsing.
      return {
        status: 'success',
        runUrl,
        logExcerpt: stdout.trim(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const cause = error instanceof Error ? error : undefined;
      if (message.includes('timed out') || message.includes('timeout')) {
        throw new GitPrError(message, GitPrErrorCode.CI_TIMEOUT, cause);
      }
      // gh run watch --exit-status exits non-zero when the run fails.
      // Node.js execFile produces errors with a numeric `code` (exit code) and
      // stdout/stderr from the process. The error.message is typically
      // "Command failed: gh run watch <id> --exit-status\n" — detect this by
      // checking for a numeric exit code or the "Command failed" prefix.
      const exitCode = (error as NodeJS.ErrnoException)?.code;
      const hasNumericExitCode = typeof exitCode === 'number';
      const isCommandFailure = message.includes('Command failed') || message.includes('exit code');
      if (hasNumericExitCode || isCommandFailure) {
        // Build a useful log excerpt from stdout/stderr if available
        const errObj = error as { stdout?: string; stderr?: string };
        const parts = [errObj.stdout, errObj.stderr, message].filter(Boolean);
        return { status: 'failure', runUrl, logExcerpt: parts.join('\n').trim() };
      }
      throw new GitPrError(message, GitPrErrorCode.GIT_ERROR, cause);
    }
  }

  async getFailureLogs(
    cwd: string,
    runId: string,
    _branch: string,
    logMaxChars = 50_000
  ): Promise<string> {
    try {
      const { stdout } = await this.execFile('gh', ['run', 'view', runId, '--log-failed'], {
        cwd,
      });
      return this.truncateLog(stdout, logMaxChars, runId);
    } catch (error) {
      throw parseGhError(error);
    }
  }

  async getMergeableStatus(cwd: string, prNumber: number): Promise<boolean | undefined> {
    try {
      const { stdout } = await this.execFile(
        'gh',
        ['pr', 'view', String(prNumber), '--json', 'mergeable'],
        { cwd }
      );
      const result = JSON.parse(stdout) as { mergeable?: string };
      return this.parseMergeable(result.mergeable);
    } catch (error) {
      throw parseGhError(error);
    }
  }

  async listPrStatuses(cwd: string): Promise<PrStatusInfo[]> {
    try {
      const { stdout } = await this.execFile(
        'gh',
        [
          'pr',
          'list',
          '--json',
          'number,state,url,headRefName,mergeable',
          '--state',
          'all',
          '--limit',
          '100',
        ],
        { cwd }
      );

      const prs = JSON.parse(stdout) as {
        number: number;
        state: string;
        url: string;
        headRefName: string;
        mergeable?: string;
      }[];
      return prs.map((pr) => ({
        number: pr.number,
        state: this.normalizeGhState(pr.state),
        url: pr.url,
        headRefName: pr.headRefName,
        mergeable: this.parseMergeable(pr.mergeable),
      }));
    } catch (error) {
      throw parseGhError(error);
    }
  }

  truncateLog(output: string, maxChars: number, runId: string): string {
    if (output.length <= maxChars) return output;
    return `${output.slice(
      0,
      maxChars
    )}\n[Log truncated at ${maxChars} chars — full log available via gh run view ${runId}]`;
  }

  parseMergeable(value: string | undefined): boolean | undefined {
    if (value === 'MERGEABLE') return true;
    if (value === 'CONFLICTING') return false;
    return undefined; // UNKNOWN or missing
  }

  normalizeGhState(state: string): PrStatus {
    const normalized = state.charAt(0).toUpperCase() + state.slice(1).toLowerCase();
    return normalized as PrStatus;
  }
}
