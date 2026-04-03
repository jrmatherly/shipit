/**
 * GetFeatureArtifactUseCase Unit Tests
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

vi.mock('@/domain/factories/spec-yaml-parser.js', () => ({
  parseSpecYaml: vi.fn(),
}));

import { GetFeatureArtifactUseCase } from '@/application/use-cases/features/get-feature-artifact.use-case.js';
import type { IFeatureRepository } from '@/application/ports/output/repositories/feature-repository.interface.js';
import { readFile } from 'node:fs/promises';
import { parseSpecYaml } from '@/domain/factories/spec-yaml-parser.js';
import { createMockFeature } from '@tests/factories/index.js';

const mockReadFile = vi.mocked(readFile);
const mockParseSpecYaml = vi.mocked(parseSpecYaml);

describe('GetFeatureArtifactUseCase', () => {
  let useCase: GetFeatureArtifactUseCase;
  let mockFeatureRepo: IFeatureRepository;

  const mockArtifact = {
    title: 'Test Feature PRD',
    overview: 'A test feature',
    problem: 'The problem',
    goals: [],
    nonGoals: [],
    userStories: [],
    acceptanceCriteria: [],
  };

  beforeEach(() => {
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

    mockReadFile.mockResolvedValue('title: Test Feature PRD' as any);
    mockParseSpecYaml.mockReturnValue(mockArtifact as any);

    useCase = new GetFeatureArtifactUseCase(mockFeatureRepo);
  });

  it('should return the parsed FeatureArtifact for a valid feature', async () => {
    const feature = createMockFeature({ id: 'feat-001', specPath: '/path/to/spec' });
    (mockFeatureRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(feature);

    const result = await useCase.execute('feat-001');

    expect(result).toEqual(mockArtifact);
  });

  it('should read spec.yaml from the feature specPath', async () => {
    const feature = createMockFeature({ specPath: '/path/to/spec' });
    (mockFeatureRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(feature);

    await useCase.execute('feat-test-001');

    expect(mockReadFile).toHaveBeenCalledWith(expect.stringContaining('spec.yaml'), 'utf-8');
  });

  it('should pass the file content to parseSpecYaml', async () => {
    const feature = createMockFeature({ specPath: '/path/to/spec' });
    const yamlContent = 'title: My Feature\noverview: desc\n';
    (mockFeatureRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(feature);
    mockReadFile.mockResolvedValue(yamlContent as any);

    await useCase.execute('feat-test-001');

    expect(mockParseSpecYaml).toHaveBeenCalledWith(yamlContent);
  });

  it('should fall back to findByIdPrefix when findById returns null', async () => {
    const feature = createMockFeature({ id: 'feat-001-full', specPath: '/path/to/spec' });
    (mockFeatureRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (mockFeatureRepo.findByIdPrefix as ReturnType<typeof vi.fn>).mockResolvedValue(feature);

    const result = await useCase.execute('feat-001');

    expect(result).toEqual(mockArtifact);
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

  it('should propagate parseSpecYaml errors', async () => {
    const feature = createMockFeature({ specPath: '/path/to/spec' });
    (mockFeatureRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(feature);
    mockParseSpecYaml.mockImplementation(() => {
      throw new Error('Invalid YAML schema');
    });

    await expect(useCase.execute('feat-test-001')).rejects.toThrow('Invalid YAML schema');
  });
});
