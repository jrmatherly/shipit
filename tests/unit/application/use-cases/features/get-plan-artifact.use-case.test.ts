/**
 * GetPlanArtifactUseCase Unit Tests
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

vi.mock('@/domain/factories/spec-yaml-parser.js', () => ({
  parsePlanYaml: vi.fn(),
}));

import { GetPlanArtifactUseCase } from '@/application/use-cases/features/get-plan-artifact.use-case.js';
import type { IFeatureRepository } from '@/application/ports/output/repositories/feature-repository.interface.js';
import { readFile } from 'node:fs/promises';
import { parsePlanYaml } from '@/domain/factories/spec-yaml-parser.js';
import { createMockFeature } from '@tests/factories/index.js';

const mockReadFile = vi.mocked(readFile);
const mockParsePlanYaml = vi.mocked(parsePlanYaml);

describe('GetPlanArtifactUseCase', () => {
  let useCase: GetPlanArtifactUseCase;
  let mockFeatureRepo: IFeatureRepository;

  const mockPlanArtifact = {
    title: 'Technical Plan',
    summary: 'A technical implementation plan',
    phases: [],
    risks: [],
    dependencies: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFeatureRepo = {
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(null),
      findByIdPrefix: vi.fn().mockResolvedValue(null),
      findBySlug: vi.fn().mockResolvedValue(null),
      findByBranch: vi.fn().mockResolvedValue(null),
      list: vi.fn().mockResolvedValue([]),
      findByParentId: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
      delete: vi.fn(),
      softDelete: vi.fn(),
    };

    mockReadFile.mockResolvedValue('title: Technical Plan' as any);
    mockParsePlanYaml.mockReturnValue(mockPlanArtifact as any);

    useCase = new GetPlanArtifactUseCase(mockFeatureRepo);
  });

  it('should return the parsed TechnicalPlanArtifact for a valid feature', async () => {
    const feature = createMockFeature({ id: 'feat-001', specPath: '/path/to/spec' });
    (mockFeatureRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(feature);

    const result = await useCase.execute('feat-001');

    expect(result).toEqual(mockPlanArtifact);
  });

  it('should read plan.yaml from the feature specPath', async () => {
    const feature = createMockFeature({ specPath: '/path/to/spec' });
    (mockFeatureRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(feature);

    await useCase.execute('feat-test-001');

    expect(mockReadFile).toHaveBeenCalledWith(expect.stringContaining('plan.yaml'), 'utf-8');
  });

  it('should pass the file content to parsePlanYaml', async () => {
    const feature = createMockFeature({ specPath: '/path/to/spec' });
    const yamlContent = 'title: My Plan\nsummary: desc\n';
    (mockFeatureRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(feature);
    mockReadFile.mockResolvedValue(yamlContent as any);

    await useCase.execute('feat-test-001');

    expect(mockParsePlanYaml).toHaveBeenCalledWith(yamlContent);
  });

  it('should fall back to findByIdPrefix when findById returns null', async () => {
    const feature = createMockFeature({ id: 'feat-001-full', specPath: '/path/to/spec' });
    (mockFeatureRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (mockFeatureRepo.findByIdPrefix as ReturnType<typeof vi.fn>).mockResolvedValue(feature);

    const result = await useCase.execute('feat-001');

    expect(result).toEqual(mockPlanArtifact);
    expect(mockFeatureRepo.findByIdPrefix).toHaveBeenCalledWith('feat-001');
  });

  it('should throw when the feature is not found by id or prefix', async () => {
    (mockFeatureRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (mockFeatureRepo.findByIdPrefix as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(useCase.execute('missing-id')).rejects.toThrow(/Feature not found: "missing-id"/);
  });

  it('should throw when the feature has no specPath', async () => {
    const feature = createMockFeature({ specPath: undefined });
    (mockFeatureRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(feature);

    await expect(useCase.execute('feat-test-001')).rejects.toThrow(/has no spec path/);
  });

  it('should propagate readFile errors', async () => {
    const feature = createMockFeature({ specPath: '/path/to/spec' });
    (mockFeatureRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(feature);
    mockReadFile.mockRejectedValue(new Error('ENOENT: no such file or directory'));

    await expect(useCase.execute('feat-test-001')).rejects.toThrow('ENOENT');
  });

  it('should propagate parsePlanYaml errors', async () => {
    const feature = createMockFeature({ specPath: '/path/to/spec' });
    (mockFeatureRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(feature);
    mockParsePlanYaml.mockImplementation(() => {
      throw new Error('Invalid plan YAML schema');
    });

    await expect(useCase.execute('feat-test-001')).rejects.toThrow('Invalid plan YAML schema');
  });

  it('should not call readFile when feature is not found', async () => {
    (mockFeatureRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (mockFeatureRepo.findByIdPrefix as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(useCase.execute('missing-id')).rejects.toThrow();

    expect(mockReadFile).not.toHaveBeenCalled();
  });
});
