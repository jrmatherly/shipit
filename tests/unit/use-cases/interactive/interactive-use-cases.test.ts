/**
 * Interactive Session Use Cases Unit Tests
 *
 * TDD: RED → GREEN → REFACTOR
 *
 * Tests all four interactive use cases:
 * - StartInteractiveSessionUseCase
 * - StopInteractiveSessionUseCase
 * - SendInteractiveMessageUseCase
 * - GetInteractiveChatStateUseCase
 *
 * Each use case is a thin delegation layer over IInteractiveSessionService.
 * Tests verify correct delegation and parameter forwarding.
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { StartInteractiveSessionUseCase } from '@/application/use-cases/interactive/start-interactive-session.use-case.js';
import { StopInteractiveSessionUseCase } from '@/application/use-cases/interactive/stop-interactive-session.use-case.js';
import { SendInteractiveMessageUseCase } from '@/application/use-cases/interactive/send-interactive-message.use-case.js';
import { GetInteractiveChatStateUseCase } from '@/application/use-cases/interactive/get-interactive-chat-state.use-case.js';
import { InteractiveSessionStatus, InteractiveMessageRole } from '@/domain/generated/output.js';
import type { IInteractiveSessionService } from '@/application/ports/output/services/interactive-session-service.interface.js';
import type { InteractiveSession, InteractiveMessage } from '@/domain/generated/output.js';
import type { ChatState } from '@/application/ports/output/services/interactive-session-service.interface.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeService(): IInteractiveSessionService {
  return {
    startSession: vi.fn(),
    stopSession: vi.fn(),
    sendMessage: vi.fn(),
    getMessages: vi.fn(),
    getSession: vi.fn(),
    clearMessages: vi.fn(),
    subscribe: vi.fn(),
    sendUserMessage: vi.fn(),
    getChatState: vi.fn(),
    subscribeByFeature: vi.fn(),
    stopByFeature: vi.fn(),
    markRead: vi.fn(),
    getTurnStatuses: vi.fn(),
    getAllActiveTurnStatuses: vi.fn(),
  };
}

function makeSession(id: string): InteractiveSession {
  return {
    id,
    featureId: 'feat-1',
    status: InteractiveSessionStatus.booting,
    startedAt: new Date(),
    lastActivityAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeMessage(id: string, content: string): InteractiveMessage {
  return {
    id,
    featureId: 'feat-1',
    sessionId: 'sess-1',
    role: InteractiveMessageRole.user,
    content,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeChatState(): ChatState {
  return {
    messages: [],
    sessionStatus: null,
    streamingText: null,
    sessionInfo: null,
    turnStatus: 'idle',
  };
}

// ---------------------------------------------------------------------------
// StartInteractiveSessionUseCase
// ---------------------------------------------------------------------------

describe('StartInteractiveSessionUseCase', () => {
  let service: IInteractiveSessionService;
  let useCase: StartInteractiveSessionUseCase;

  beforeEach(() => {
    service = makeService();
    useCase = new StartInteractiveSessionUseCase(service);
  });

  it('delegates to service.startSession with featureId and worktreePath', async () => {
    const session = makeSession('sess-1');
    vi.mocked(service.startSession).mockResolvedValue(session);

    const result = await useCase.execute({ featureId: 'feat-1', worktreePath: '/wt' });

    expect(service.startSession).toHaveBeenCalledWith('feat-1', '/wt', undefined, undefined);
    expect(result).toBe(session);
  });

  it('forwards the optional model parameter', async () => {
    vi.mocked(service.startSession).mockResolvedValue(makeSession('sess-1'));

    await useCase.execute({
      featureId: 'feat-1',
      worktreePath: '/wt',
      model: 'claude-opus-4',
    });

    expect(service.startSession).toHaveBeenCalledWith('feat-1', '/wt', 'claude-opus-4', undefined);
  });

  it('forwards the optional agentType parameter', async () => {
    vi.mocked(service.startSession).mockResolvedValue(makeSession('sess-1'));

    await useCase.execute({
      featureId: 'feat-1',
      worktreePath: '/wt',
      agentType: 'OpenAI',
    });

    expect(service.startSession).toHaveBeenCalledWith('feat-1', '/wt', undefined, 'OpenAI');
  });

  it('propagates errors from the service', async () => {
    vi.mocked(service.startSession).mockRejectedValue(new Error('limit reached'));

    await expect(useCase.execute({ featureId: 'feat-1', worktreePath: '/wt' })).rejects.toThrow(
      'limit reached'
    );
  });

  it('returns the session object from the service', async () => {
    const expected = makeSession('sess-xyz');
    vi.mocked(service.startSession).mockResolvedValue(expected);

    const result = await useCase.execute({ featureId: 'feat-1', worktreePath: '/wt' });
    expect(result.id).toBe('sess-xyz');
    expect(result.status).toBe(InteractiveSessionStatus.booting);
  });
});

// ---------------------------------------------------------------------------
// StopInteractiveSessionUseCase
// ---------------------------------------------------------------------------

describe('StopInteractiveSessionUseCase', () => {
  let service: IInteractiveSessionService;
  let useCase: StopInteractiveSessionUseCase;

  beforeEach(() => {
    service = makeService();
    useCase = new StopInteractiveSessionUseCase(service);
    vi.mocked(service.stopByFeature).mockResolvedValue(undefined);
  });

  it('delegates to service.stopByFeature with the featureId', async () => {
    await useCase.execute({ featureId: 'feat-1' });
    expect(service.stopByFeature).toHaveBeenCalledWith('feat-1');
  });

  it('resolves void (returns undefined)', async () => {
    const result = await useCase.execute({ featureId: 'feat-1' });
    expect(result).toBeUndefined();
  });

  it('propagates errors from the service', async () => {
    vi.mocked(service.stopByFeature).mockRejectedValue(new Error('stop failed'));
    await expect(useCase.execute({ featureId: 'feat-1' })).rejects.toThrow('stop failed');
  });
});

// ---------------------------------------------------------------------------
// SendInteractiveMessageUseCase
// ---------------------------------------------------------------------------

describe('SendInteractiveMessageUseCase', () => {
  let service: IInteractiveSessionService;
  let useCase: SendInteractiveMessageUseCase;

  beforeEach(() => {
    service = makeService();
    useCase = new SendInteractiveMessageUseCase(service);
  });

  it('delegates to service.sendUserMessage with required fields', async () => {
    const msg = makeMessage('msg-1', 'Hello!');
    vi.mocked(service.sendUserMessage).mockResolvedValue(msg);

    const result = await useCase.execute({
      featureId: 'feat-1',
      content: 'Hello!',
      worktreePath: '/wt',
    });

    expect(service.sendUserMessage).toHaveBeenCalledWith(
      'feat-1',
      'Hello!',
      '/wt',
      undefined,
      undefined
    );
    expect(result).toBe(msg);
  });

  it('forwards optional model parameter', async () => {
    vi.mocked(service.sendUserMessage).mockResolvedValue(makeMessage('msg-1', 'Hi'));

    await useCase.execute({
      featureId: 'feat-1',
      content: 'Hi',
      worktreePath: '/wt',
      model: 'claude-opus-4',
    });

    expect(service.sendUserMessage).toHaveBeenCalledWith(
      'feat-1',
      'Hi',
      '/wt',
      'claude-opus-4',
      undefined
    );
  });

  it('forwards optional agentType parameter', async () => {
    vi.mocked(service.sendUserMessage).mockResolvedValue(makeMessage('msg-1', 'Hi'));

    await useCase.execute({
      featureId: 'feat-1',
      content: 'Hi',
      worktreePath: '/wt',
      agentType: 'OpenAI',
    });

    expect(service.sendUserMessage).toHaveBeenCalledWith(
      'feat-1',
      'Hi',
      '/wt',
      undefined,
      'OpenAI'
    );
  });

  it('returns the persisted user message', async () => {
    const expected = makeMessage('msg-123', 'Test message');
    vi.mocked(service.sendUserMessage).mockResolvedValue(expected);

    const result = await useCase.execute({
      featureId: 'feat-1',
      content: 'Test message',
      worktreePath: '/wt',
    });

    expect(result.id).toBe('msg-123');
    expect(result.content).toBe('Test message');
    expect(result.role).toBe(InteractiveMessageRole.user);
  });

  it('propagates errors from the service', async () => {
    vi.mocked(service.sendUserMessage).mockRejectedValue(new Error('send failed'));

    await expect(
      useCase.execute({ featureId: 'feat-1', content: 'Hi', worktreePath: '/wt' })
    ).rejects.toThrow('send failed');
  });
});

// ---------------------------------------------------------------------------
// GetInteractiveChatStateUseCase
// ---------------------------------------------------------------------------

describe('GetInteractiveChatStateUseCase', () => {
  let service: IInteractiveSessionService;
  let useCase: GetInteractiveChatStateUseCase;

  beforeEach(() => {
    service = makeService();
    useCase = new GetInteractiveChatStateUseCase(service);
  });

  it('delegates to service.getChatState with the featureId', async () => {
    const state = makeChatState();
    vi.mocked(service.getChatState).mockResolvedValue(state);

    const result = await useCase.execute({ featureId: 'feat-1' });

    expect(service.getChatState).toHaveBeenCalledWith('feat-1');
    expect(result).toBe(state);
  });

  it('returns messages from the chat state', async () => {
    const state: ChatState = {
      ...makeChatState(),
      messages: [makeMessage('m1', 'Hello'), makeMessage('m2', 'World')],
    };
    vi.mocked(service.getChatState).mockResolvedValue(state);

    const result = await useCase.execute({ featureId: 'feat-1' });
    expect(result.messages).toHaveLength(2);
  });

  it('returns sessionStatus from the chat state', async () => {
    const state: ChatState = {
      ...makeChatState(),
      sessionStatus: InteractiveSessionStatus.ready,
    };
    vi.mocked(service.getChatState).mockResolvedValue(state);

    const result = await useCase.execute({ featureId: 'feat-1' });
    expect(result.sessionStatus).toBe(InteractiveSessionStatus.ready);
  });

  it('returns streamingText from the chat state', async () => {
    const state: ChatState = {
      ...makeChatState(),
      streamingText: 'Partial response...',
    };
    vi.mocked(service.getChatState).mockResolvedValue(state);

    const result = await useCase.execute({ featureId: 'feat-1' });
    expect(result.streamingText).toBe('Partial response...');
  });

  it('returns turnStatus from the chat state', async () => {
    const state: ChatState = {
      ...makeChatState(),
      turnStatus: 'processing',
    };
    vi.mocked(service.getChatState).mockResolvedValue(state);

    const result = await useCase.execute({ featureId: 'feat-1' });
    expect(result.turnStatus).toBe('processing');
  });

  it('propagates errors from the service', async () => {
    vi.mocked(service.getChatState).mockRejectedValue(new Error('db error'));
    await expect(useCase.execute({ featureId: 'feat-1' })).rejects.toThrow('db error');
  });
});
