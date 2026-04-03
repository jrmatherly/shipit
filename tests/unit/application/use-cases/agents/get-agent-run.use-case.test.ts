/**
 * GetAgentRunUseCase Unit Tests
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetAgentRunUseCase } from '@/application/use-cases/agents/get-agent-run.use-case.js';
import type { IAgentRunRepository } from '@/application/ports/output/agents/agent-run-repository.interface.js';
import { AgentRunStatus } from '@/domain/generated/output.js';
import { createMockAgentRun } from '@tests/factories/index.js';

describe('GetAgentRunUseCase', () => {
  let useCase: GetAgentRunUseCase;
  let mockRepo: IAgentRunRepository;

  beforeEach(() => {
    mockRepo = {
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(null),
      findByThreadId: vi.fn(),
      updateStatus: vi.fn(),
      findRunningByPid: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
      listActive: vi.fn().mockResolvedValue([]),
      findByIds: vi.fn().mockResolvedValue([]),
      delete: vi.fn(),
    };
    useCase = new GetAgentRunUseCase(mockRepo);
  });

  it('should return the agent run when found by id', async () => {
    const run = createMockAgentRun({ id: 'run-abc-123' });
    (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(run);

    const result = await useCase.execute('run-abc-123');

    expect(result).toEqual(run);
    expect(mockRepo.findById).toHaveBeenCalledWith('run-abc-123');
  });

  it('should return null when the agent run is not found', async () => {
    (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await useCase.execute('non-existent-id');

    expect(result).toBeNull();
  });

  it('should call findById with the provided id', async () => {
    await useCase.execute('some-run-id');

    expect(mockRepo.findById).toHaveBeenCalledWith('some-run-id');
    expect(mockRepo.findById).toHaveBeenCalledTimes(1);
  });

  it('should propagate repository errors', async () => {
    const dbError = new Error('Database connection failed');
    (mockRepo.findById as ReturnType<typeof vi.fn>).mockRejectedValue(dbError);

    await expect(useCase.execute('run-id')).rejects.toThrow('Database connection failed');
  });

  it('should return the exact run object from the repository without transformation', async () => {
    const run = createMockAgentRun({ id: 'run-xyz', status: AgentRunStatus.running });
    (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(run);

    const result = await useCase.execute('run-xyz');

    expect(result).toBe(run);
  });
});
