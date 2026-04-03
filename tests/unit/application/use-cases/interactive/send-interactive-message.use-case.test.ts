/**
 * SendInteractiveMessageUseCase Unit Tests
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SendInteractiveMessageUseCase } from '@/application/use-cases/interactive/send-interactive-message.use-case.js';
import type { IInteractiveSessionService } from '@/application/ports/output/services/interactive-session-service.interface.js';
import { InteractiveMessageRole } from '@/domain/generated/output.js';
import type { InteractiveMessage } from '@/domain/generated/output.js';

function createMockMessage(overrides?: Partial<InteractiveMessage>): InteractiveMessage {
  return {
    id: 'msg-test-001',
    featureId: 'feat-test-001',
    role: InteractiveMessageRole.user,
    content: 'Hello agent',
    createdAt: new Date('2025-01-01T10:00:00Z'),
    updatedAt: new Date('2025-01-01T10:00:00Z'),
    ...overrides,
  };
}

describe('SendInteractiveMessageUseCase', () => {
  let useCase: SendInteractiveMessageUseCase;
  let mockService: IInteractiveSessionService;

  const baseInput = {
    featureId: 'feat-test-001',
    content: 'Implement the authentication feature',
    worktreePath: '/repos/test-project/worktrees/feat-test',
  };

  beforeEach(() => {
    mockService = {
      startSession: vi.fn(),
      stopSession: vi.fn(),
      sendMessage: vi.fn(),
      getMessages: vi.fn(),
      getSession: vi.fn(),
      clearMessages: vi.fn(),
      subscribe: vi.fn(),
      sendUserMessage: vi.fn().mockResolvedValue(createMockMessage()),
      getChatState: vi.fn(),
      subscribeByFeature: vi.fn(),
      stopByFeature: vi.fn(),
      markRead: vi.fn(),
      getTurnStatuses: vi.fn(),
      getAllActiveTurnStatuses: vi.fn(),
    } as unknown as IInteractiveSessionService;

    useCase = new SendInteractiveMessageUseCase(mockService);
  });

  it('should delegate to service.sendUserMessage and return the message', async () => {
    const persistedMessage = createMockMessage({ content: baseInput.content });
    (mockService.sendUserMessage as ReturnType<typeof vi.fn>).mockResolvedValue(persistedMessage);

    const result = await useCase.execute(baseInput);

    expect(result).toEqual(persistedMessage);
  });

  it('should call sendUserMessage with the correct featureId', async () => {
    await useCase.execute(baseInput);

    expect(mockService.sendUserMessage).toHaveBeenCalledWith(
      'feat-test-001',
      expect.any(String),
      expect.any(String),
      undefined,
      undefined
    );
  });

  it('should call sendUserMessage with the correct content', async () => {
    await useCase.execute(baseInput);

    expect(mockService.sendUserMessage).toHaveBeenCalledWith(
      expect.any(String),
      'Implement the authentication feature',
      expect.any(String),
      undefined,
      undefined
    );
  });

  it('should call sendUserMessage with the correct worktreePath', async () => {
    await useCase.execute(baseInput);

    expect(mockService.sendUserMessage).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      '/repos/test-project/worktrees/feat-test',
      undefined,
      undefined
    );
  });

  it('should pass the model when provided', async () => {
    await useCase.execute({ ...baseInput, model: 'claude-opus-4-6' });

    expect(mockService.sendUserMessage).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(String),
      'claude-opus-4-6',
      undefined
    );
  });

  it('should pass agentType when provided', async () => {
    await useCase.execute({ ...baseInput, agentType: 'gemini-cli' });

    expect(mockService.sendUserMessage).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(String),
      undefined,
      'gemini-cli'
    );
  });

  it('should pass both model and agentType when both are provided', async () => {
    await useCase.execute({ ...baseInput, model: 'gemini-1.5-pro', agentType: 'gemini-cli' });

    expect(mockService.sendUserMessage).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(String),
      'gemini-1.5-pro',
      'gemini-cli'
    );
  });

  it('should call sendUserMessage exactly once', async () => {
    await useCase.execute(baseInput);

    expect(mockService.sendUserMessage).toHaveBeenCalledTimes(1);
  });

  it('should propagate service errors', async () => {
    (mockService.sendUserMessage as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Session not ready')
    );

    await expect(useCase.execute(baseInput)).rejects.toThrow('Session not ready');
  });

  it('should return the exact message object from the service without transformation', async () => {
    const message = createMockMessage({ id: 'msg-exact-001' });
    (mockService.sendUserMessage as ReturnType<typeof vi.fn>).mockResolvedValue(message);

    const result = await useCase.execute(baseInput);

    expect(result).toBe(message);
  });
});
