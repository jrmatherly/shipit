/**
 * AdoptBranchUseCase Unit Tests
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdoptBranchUseCase } from '@/application/use-cases/features/adopt-branch.use-case.js';
import type { IFeatureRepository } from '@/application/ports/output/repositories/feature-repository.interface.js';
import type { IRepositoryRepository } from '@/application/ports/output/repositories/repository-repository.interface.js';
import type { IWorktreeService } from '@/application/ports/output/services/worktree-service.interface.js';
import type { IGitPrService } from '@/application/ports/output/services/git-pr-service.interface.js';
import { SdlcLifecycle, PrStatus } from '@/domain/generated/output.js';
import type { Repository } from '@/domain/generated/output.js';

const testRepository: Repository = {
  id: 'repo-test-001',
  name: 'test-project',
  path: '/repos/test-project',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
};

describe('AdoptBranchUseCase', () => {
  let useCase: AdoptBranchUseCase;
  let mockFeatureRepo: IFeatureRepository;
  let mockRepositoryRepo: IRepositoryRepository;
  let mockWorktreeService: IWorktreeService;
  let mockGitPrService: IGitPrService;

  const baseInput = {
    branchName: 'feat/my-new-feature',
    repositoryPath: '/repos/test-project',
  };

  beforeEach(() => {
    mockFeatureRepo = {
      create: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn().mockResolvedValue(null),
      findByIdPrefix: vi.fn().mockResolvedValue(null),
      findBySlug: vi.fn().mockResolvedValue(null),
      findByBranch: vi.fn().mockResolvedValue(null),
      list: vi.fn().mockResolvedValue([]),
      findByParentId: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      softDelete: vi.fn().mockResolvedValue(undefined),
    };

    mockRepositoryRepo = {
      create: vi.fn().mockResolvedValue(testRepository),
      findById: vi.fn().mockResolvedValue(null),
      findByPath: vi.fn().mockResolvedValue(testRepository),
      findByPathIncludingDeleted: vi.fn().mockResolvedValue(null),
      findByRemoteUrl: vi.fn().mockResolvedValue(null),
      list: vi.fn().mockResolvedValue([]),
      remove: vi.fn().mockResolvedValue(undefined),
      softDelete: vi.fn().mockResolvedValue(undefined),
      restore: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
    };

    mockWorktreeService = {
      create: vi.fn().mockResolvedValue(undefined),
      addExisting: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      prune: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockResolvedValue([]),
      exists: vi.fn().mockResolvedValue(false),
      branchExists: vi.fn().mockResolvedValue(true),
      remoteBranchExists: vi.fn().mockResolvedValue(false),
      getWorktreePath: vi.fn().mockReturnValue('/worktrees/my-new-feature'),
      ensureGitRepository: vi.fn().mockResolvedValue(undefined),
      listBranches: vi.fn().mockResolvedValue([]),
    };

    mockGitPrService = {
      getDefaultBranch: vi.fn().mockResolvedValue('main'),
      syncMain: vi.fn().mockResolvedValue(undefined),
      createPr: vi.fn().mockResolvedValue(undefined),
      getPr: vi.fn().mockResolvedValue(null),
      getMergeableStatus: vi.fn().mockResolvedValue(undefined),
      hasRemote: vi.fn().mockResolvedValue(false),
      listPrStatuses: vi.fn().mockResolvedValue([]),
    } as unknown as IGitPrService;

    useCase = new AdoptBranchUseCase(
      mockFeatureRepo,
      mockRepositoryRepo,
      mockWorktreeService,
      mockGitPrService
    );
  });

  // --------------------------------------------------------------------------
  // Happy path
  // --------------------------------------------------------------------------

  it('should create a feature and return it on success', async () => {
    const result = await useCase.execute(baseInput);

    expect(result.feature).toBeDefined();
    expect(result.feature.branch).toBe('feat/my-new-feature');
    expect(mockFeatureRepo.create).toHaveBeenCalledOnce();
  });

  it('should derive the feature name from the branch name', async () => {
    const result = await useCase.execute(baseInput);

    expect(result.feature.name).toBeTruthy();
    expect(typeof result.feature.name).toBe('string');
  });

  it('should set lifecycle to Maintain when there is no open PR', async () => {
    const result = await useCase.execute(baseInput);

    expect(result.feature.lifecycle).toBe(SdlcLifecycle.Maintain);
  });

  it('should set lifecycle to Review when the branch has an open PR', async () => {
    (mockGitPrService.hasRemote as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (mockGitPrService.listPrStatuses as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        headRefName: 'feat/my-new-feature',
        url: 'https://github.com/org/repo/pull/42',
        number: 42,
        state: PrStatus.Open,
        mergeable: 'MERGEABLE',
      },
    ]);

    const result = await useCase.execute(baseInput);

    expect(result.feature.lifecycle).toBe(SdlcLifecycle.Review);
    expect(result.feature.openPr).toBe(true);
  });

  it('should set lifecycle to Maintain when the PR is merged', async () => {
    (mockGitPrService.hasRemote as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (mockGitPrService.listPrStatuses as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        headRefName: 'feat/my-new-feature',
        url: 'https://github.com/org/repo/pull/42',
        number: 42,
        state: PrStatus.Merged,
        mergeable: 'MERGED',
      },
    ]);

    const result = await useCase.execute(baseInput);

    expect(result.feature.lifecycle).toBe(SdlcLifecycle.Maintain);
  });

  it('should reuse existing worktree when one already exists', async () => {
    (mockWorktreeService.exists as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const result = await useCase.execute(baseInput);

    expect(result.feature).toBeDefined();
    expect(mockWorktreeService.addExisting).not.toHaveBeenCalled();
  });

  it('should create a new worktree when one does not exist', async () => {
    (mockWorktreeService.exists as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    await useCase.execute(baseInput);

    expect(mockWorktreeService.addExisting).toHaveBeenCalledOnce();
  });

  // --------------------------------------------------------------------------
  // Repository resolution
  // --------------------------------------------------------------------------

  it('should use existing repository when found by path', async () => {
    (mockRepositoryRepo.findByPath as ReturnType<typeof vi.fn>).mockResolvedValue(testRepository);

    const result = await useCase.execute(baseInput);

    expect(result.feature.repositoryId).toBe(testRepository.id);
    expect(mockRepositoryRepo.create).not.toHaveBeenCalled();
  });

  it('should create a new repository when none is found by path', async () => {
    (mockRepositoryRepo.findByPath as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (mockRepositoryRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue(testRepository);

    const result = await useCase.execute(baseInput);

    expect(mockRepositoryRepo.create).toHaveBeenCalledOnce();
    expect(result.feature.repositoryId).toBe(testRepository.id);
  });

  // --------------------------------------------------------------------------
  // Protected branch guard
  // --------------------------------------------------------------------------

  it('should throw when trying to adopt the main branch', async () => {
    await expect(
      useCase.execute({ branchName: 'main', repositoryPath: '/repos/test-project' })
    ).rejects.toThrow(/Cannot adopt the "main" branch/);
  });

  it('should throw when trying to adopt the master branch', async () => {
    await expect(
      useCase.execute({ branchName: 'master', repositoryPath: '/repos/test-project' })
    ).rejects.toThrow(/Cannot adopt the "master" branch/);
  });

  // --------------------------------------------------------------------------
  // Duplicate adoption guard
  // --------------------------------------------------------------------------

  it('should throw when the branch is already tracked as a feature', async () => {
    const existing = {
      id: 'existing-feat-id',
      name: 'Existing Feature',
      slug: 'existing-feature',
      branch: 'feat/my-new-feature',
      repositoryPath: '/repos/test-project',
    };
    (mockFeatureRepo.findByBranch as ReturnType<typeof vi.fn>).mockResolvedValue(existing);

    await expect(useCase.execute(baseInput)).rejects.toThrow(
      /Branch "feat\/my-new-feature" is already tracked/
    );
  });

  // --------------------------------------------------------------------------
  // Slug collision guard
  // --------------------------------------------------------------------------

  it('should throw when a feature with the same slug already exists', async () => {
    const slugCollision = {
      id: 'other-feat-id',
      name: 'Other Feature',
      slug: 'my-new-feature',
      repositoryPath: '/repos/test-project',
    };
    (mockFeatureRepo.findBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(slugCollision);

    await expect(useCase.execute(baseInput)).rejects.toThrow(/slug.*already exists/);
  });

  // --------------------------------------------------------------------------
  // Branch existence guard
  // --------------------------------------------------------------------------

  it('should throw when branch does not exist locally or remotely', async () => {
    (mockWorktreeService.branchExists as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    (mockWorktreeService.remoteBranchExists as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    await expect(useCase.execute(baseInput)).rejects.toThrow(
      /does not exist locally or on the remote/
    );
  });

  it('should succeed for a remote-only branch by using origin/ prefix', async () => {
    (mockWorktreeService.branchExists as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    (mockWorktreeService.remoteBranchExists as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const result = await useCase.execute(baseInput);

    expect(result.feature).toBeDefined();
    expect(mockWorktreeService.addExisting).toHaveBeenCalledWith(
      '/repos/test-project',
      'origin/feat/my-new-feature',
      expect.any(String)
    );
  });

  // --------------------------------------------------------------------------
  // PR detection errors are handled gracefully
  // --------------------------------------------------------------------------

  it('should gracefully handle PR detection failures and default to Maintain lifecycle', async () => {
    (mockGitPrService.hasRemote as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('gh CLI not installed')
    );

    const result = await useCase.execute(baseInput);

    expect(result.feature.lifecycle).toBe(SdlcLifecycle.Maintain);
  });
});
