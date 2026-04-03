/**
 * Git PR Service Facade
 *
 * Thin facade that delegates to 5 focused service classes.
 * Maintains full backward compatibility via IGitPrService interface.
 */

import { injectable, inject } from 'tsyringe';
import type { IGitPrService } from '../../../application/ports/output/services/git-pr-service.interface.js';
import type {
  CiStatusResult,
  DiffSummary,
  FileDiff,
  MergeStrategy,
  PrCreateResult,
  PrStatusInfo,
} from '../../../application/ports/output/services/git-pr-service.interface.js';
import type { DiffAnalyzerService } from './diff-analyzer.service.js';
import type { BranchDiscoveryService } from './branch-discovery.service.js';
import type { CiStatusService } from './ci-status.service.js';
import type { PrCreationService } from './pr-creation.service.js';
import type { MergeStrategyService } from './merge-strategy.service.js';

@injectable()
export class GitPrService implements IGitPrService {
  constructor(
    @inject('IDiffAnalyzerService') private readonly diffAnalyzer: DiffAnalyzerService,
    @inject('IBranchDiscoveryService') private readonly branchDiscovery: BranchDiscoveryService,
    @inject('ICiStatusService') private readonly ciStatus: CiStatusService,
    @inject('IPrCreationService') private readonly prCreation: PrCreationService,
    @inject('IMergeStrategyService') private readonly mergeStrategy: MergeStrategyService
  ) {}

  // --- IDiffAnalyzerService ---

  getPrDiffSummary(cwd: string, baseBranch: string): Promise<DiffSummary> {
    return this.diffAnalyzer.getPrDiffSummary(cwd, baseBranch);
  }

  getFileDiffs(cwd: string, baseBranch: string): Promise<FileDiff[]> {
    return this.diffAnalyzer.getFileDiffs(cwd, baseBranch);
  }

  // --- IBranchDiscoveryService ---

  hasRemote(cwd: string): Promise<boolean> {
    return this.branchDiscovery.hasRemote(cwd);
  }

  getRemoteUrl(cwd: string): Promise<string | null> {
    return this.branchDiscovery.getRemoteUrl(cwd);
  }

  getDefaultBranch(cwd: string): Promise<string> {
    return this.branchDiscovery.getDefaultBranch(cwd);
  }

  revParse(cwd: string, ref: string): Promise<string> {
    return this.branchDiscovery.revParse(cwd, ref);
  }

  deleteBranch(cwd: string, branch: string, deleteRemote?: boolean): Promise<void> {
    return this.branchDiscovery.deleteBranch(cwd, branch, deleteRemote);
  }

  getBranchSyncStatus(
    cwd: string,
    featureBranch: string,
    baseBranch: string
  ): Promise<{ ahead: number; behind: number }> {
    return this.branchDiscovery.getBranchSyncStatus(cwd, featureBranch, baseBranch);
  }

  // --- ICiStatusService ---

  getCiStatus(cwd: string, branch: string): Promise<CiStatusResult> {
    return this.ciStatus.getCiStatus(cwd, branch);
  }

  watchCi(
    cwd: string,
    branch: string,
    timeoutMs?: number,
    intervalSeconds?: number
  ): Promise<CiStatusResult> {
    return this.ciStatus.watchCi(cwd, branch, timeoutMs, intervalSeconds);
  }

  getFailureLogs(
    cwd: string,
    runId: string,
    branch: string,
    logMaxChars?: number
  ): Promise<string> {
    return this.ciStatus.getFailureLogs(cwd, runId, branch, logMaxChars);
  }

  getMergeableStatus(cwd: string, prNumber: number): Promise<boolean | undefined> {
    return this.ciStatus.getMergeableStatus(cwd, prNumber);
  }

  listPrStatuses(cwd: string): Promise<PrStatusInfo[]> {
    return this.ciStatus.listPrStatuses(cwd);
  }

  // --- IPrCreationService ---

  hasUncommittedChanges(cwd: string): Promise<boolean> {
    return this.prCreation.hasUncommittedChanges(cwd);
  }

  commitAll(cwd: string, message: string): Promise<string> {
    return this.prCreation.commitAll(cwd, message);
  }

  push(cwd: string, branch: string, setUpstream?: boolean): Promise<void> {
    return this.prCreation.push(cwd, branch, setUpstream);
  }

  createPr(cwd: string, prYamlPath: string): Promise<PrCreateResult> {
    return this.prCreation.createPr(cwd, prYamlPath);
  }

  // --- IMergeStrategyService ---

  mergePr(cwd: string, prNumber: number, strategy?: MergeStrategy): Promise<void> {
    return this.mergeStrategy.mergePr(cwd, prNumber, strategy);
  }

  localMergeSquash(
    cwd: string,
    featureBranch: string,
    baseBranch: string,
    commitMessage: string,
    hasRemote?: boolean
  ): Promise<void> {
    return this.mergeStrategy.localMergeSquash(
      cwd,
      featureBranch,
      baseBranch,
      commitMessage,
      hasRemote
    );
  }

  mergeBranch(cwd: string, sourceBranch: string, targetBranch: string): Promise<void> {
    return this.mergeStrategy.mergeBranch(cwd, sourceBranch, targetBranch);
  }

  verifyMerge(
    cwd: string,
    featureBranch: string,
    baseBranch: string,
    premergeBaseSha?: string
  ): Promise<boolean> {
    return this.mergeStrategy.verifyMerge(cwd, featureBranch, baseBranch, premergeBaseSha);
  }

  syncMain(cwd: string, baseBranch: string): Promise<void> {
    return this.mergeStrategy.syncMain(cwd, baseBranch);
  }

  rebaseOnMain(cwd: string, featureBranch: string, baseBranch: string): Promise<void> {
    return this.mergeStrategy.rebaseOnMain(cwd, featureBranch, baseBranch);
  }

  getConflictedFiles(cwd: string): Promise<string[]> {
    return this.mergeStrategy.getConflictedFiles(cwd);
  }

  stageFiles(cwd: string, files: string[]): Promise<void> {
    return this.mergeStrategy.stageFiles(cwd, files);
  }

  rebaseContinue(cwd: string): Promise<void> {
    return this.mergeStrategy.rebaseContinue(cwd);
  }

  rebaseAbort(cwd: string): Promise<void> {
    return this.mergeStrategy.rebaseAbort(cwd);
  }

  stash(cwd: string, message?: string): Promise<boolean> {
    return this.mergeStrategy.stash(cwd, message);
  }

  stashPop(cwd: string): Promise<void> {
    return this.mergeStrategy.stashPop(cwd);
  }
}
