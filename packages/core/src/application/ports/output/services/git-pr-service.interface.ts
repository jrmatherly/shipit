/**
 * Git PR Service Interface
 *
 * Output port for git PR and merge operations.
 * Implementations manage PR creation, merging, and CI status checks.
 */

import type { PrStatus } from '../../../../domain/generated/output.js';

/**
 * Error codes for git PR operations.
 */
export enum GitPrErrorCode {
  AUTH_FAILURE = 'AUTH_FAILURE',
  BRANCH_NOT_FOUND = 'BRANCH_NOT_FOUND',
  CI_TIMEOUT = 'CI_TIMEOUT',
  GH_NOT_FOUND = 'GH_NOT_FOUND',
  GIT_ERROR = 'GIT_ERROR',
  MERGE_CONFLICT = 'MERGE_CONFLICT',
  MERGE_FAILED = 'MERGE_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PR_NOT_FOUND = 'PR_NOT_FOUND',
  REBASE_CONFLICT = 'REBASE_CONFLICT',
  SYNC_FAILED = 'SYNC_FAILED',
}

/**
 * Typed error for git PR operations.
 */
export class GitPrError extends Error {
  constructor(
    message: string,
    public readonly code: GitPrErrorCode,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'GitPrError';
  }
}

/**
 * CI check status values.
 */
export type CiStatus = 'success' | 'failure' | 'pending';

/**
 * Result of a CI status check.
 */
export interface CiStatusResult {
  /** Overall CI status */
  status: CiStatus;
  /** URL to the CI run (e.g., GitHub Actions run URL) */
  runUrl?: string;
  /** Excerpt from CI logs (e.g., failure output) */
  logExcerpt?: string;
}

/**
 * Summary of diff statistics between branches or commits.
 */
export interface DiffSummary {
  /** Number of files changed */
  filesChanged: number;
  /** Number of lines added */
  additions: number;
  /** Number of lines deleted */
  deletions: number;
  /** Number of commits in the diff */
  commitCount: number;
}

/**
 * A single hunk in a file diff showing the actual line changes.
 */
export interface DiffHunk {
  /** Header line (e.g. "@@ -1,5 +1,7 @@") */
  header: string;
  /** Lines in this hunk with their type and content */
  lines: DiffLine[];
}

/**
 * A single line within a diff hunk.
 */
export interface DiffLine {
  /** Type of change: added, removed, or context (unchanged) */
  type: 'added' | 'removed' | 'context';
  /** The line content (without the leading +/-/space) */
  content: string;
  /** Old file line number (undefined for added lines) */
  oldNumber?: number;
  /** New file line number (undefined for removed lines) */
  newNumber?: number;
}

/**
 * Per-file diff data showing what changed in a single file.
 */
export interface FileDiff {
  /** File path (new path for renames) */
  path: string;
  /** Previous path if the file was renamed */
  oldPath?: string;
  /** Number of lines added */
  additions: number;
  /** Number of lines removed */
  deletions: number;
  /** Change type */
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  /** Diff hunks with actual line changes */
  hunks: DiffHunk[];
}

/**
 * Result of creating a pull request.
 */
export interface PrCreateResult {
  /** URL of the created PR */
  url: string;
  /** PR number */
  number: number;
}

/**
 * PR status information returned by batch status queries.
 */
export interface PrStatusInfo {
  /** PR number */
  number: number;
  /** Current PR state (Open, Merged, or Closed) */
  state: PrStatus;
  /** URL of the pull request */
  url: string;
  /** Head branch name of the PR */
  headRefName: string;
  /** Whether the PR can be merged (undefined if unknown, false = merge conflicts) */
  mergeable?: boolean;
}

/**
 * Merge strategy for pull requests.
 */
export type MergeStrategy = 'squash' | 'merge' | 'rebase';

/**
 * Service interface for diff analysis operations.
 */
export interface IDiffAnalyzerService {
  getPrDiffSummary(cwd: string, baseBranch: string): Promise<DiffSummary>;
  getFileDiffs(cwd: string, baseBranch: string): Promise<FileDiff[]>;
}

/**
 * Service interface for branch discovery operations.
 */
export interface IBranchDiscoveryService {
  hasRemote(cwd: string): Promise<boolean>;
  getRemoteUrl(cwd: string): Promise<string | null>;
  getDefaultBranch(cwd: string): Promise<string>;
  revParse(cwd: string, ref: string): Promise<string>;
  deleteBranch(cwd: string, branch: string, deleteRemote?: boolean): Promise<void>;
  getBranchSyncStatus(
    cwd: string,
    featureBranch: string,
    baseBranch: string
  ): Promise<{ ahead: number; behind: number }>;
}

/**
 * Service interface for CI status and PR status operations.
 */
export interface ICiStatusService {
  getCiStatus(cwd: string, branch: string): Promise<CiStatusResult>;
  watchCi(
    cwd: string,
    branch: string,
    timeoutMs?: number,
    intervalSeconds?: number
  ): Promise<CiStatusResult>;
  getFailureLogs(cwd: string, runId: string, branch: string, logMaxChars?: number): Promise<string>;
  getMergeableStatus(cwd: string, prNumber: number): Promise<boolean | undefined>;
  listPrStatuses(cwd: string): Promise<PrStatusInfo[]>;
}

/**
 * Service interface for PR creation and commit operations.
 */
export interface IPrCreationService {
  hasUncommittedChanges(cwd: string): Promise<boolean>;
  commitAll(cwd: string, message: string): Promise<string>;
  push(cwd: string, branch: string, setUpstream?: boolean): Promise<void>;
  createPr(cwd: string, prYamlPath: string): Promise<PrCreateResult>;
}

/**
 * Service interface for merge and rebase strategy operations.
 */
export interface IMergeStrategyService {
  mergePr(cwd: string, prNumber: number, strategy?: MergeStrategy): Promise<void>;
  localMergeSquash(
    cwd: string,
    featureBranch: string,
    baseBranch: string,
    commitMessage: string,
    hasRemote?: boolean
  ): Promise<void>;
  mergeBranch(cwd: string, sourceBranch: string, targetBranch: string): Promise<void>;
  verifyMerge(
    cwd: string,
    featureBranch: string,
    baseBranch: string,
    premergeBaseSha?: string
  ): Promise<boolean>;
  syncMain(cwd: string, baseBranch: string): Promise<void>;
  rebaseOnMain(cwd: string, featureBranch: string, baseBranch: string): Promise<void>;
  getConflictedFiles(cwd: string): Promise<string[]>;
  stageFiles(cwd: string, files: string[]): Promise<void>;
  rebaseContinue(cwd: string): Promise<void>;
  rebaseAbort(cwd: string): Promise<void>;
  stash(cwd: string, message?: string): Promise<boolean>;
  stashPop(cwd: string): Promise<void>;
}

/**
 * Service interface for git PR and merge operations.
 * Extends all 5 focused sub-interfaces via the facade pattern.
 */
export interface IGitPrService
  extends
    IDiffAnalyzerService,
    IBranchDiscoveryService,
    ICiStatusService,
    IPrCreationService,
    IMergeStrategyService {}
