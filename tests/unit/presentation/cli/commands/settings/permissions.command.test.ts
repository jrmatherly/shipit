/**
 * Permissions Settings Command Unit Tests
 *
 * Tests for the `shipit-ai settings permissions` command.
 *
 * TDD Phase: RED -> GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Command } from 'commander';
import { AgentType, AgentAuthMethod } from '@/domain/generated/output.js';

// Hoisted mocks
const { mockContainerResolve, mockSelect, mockMessages, mockGetSettings } = vi.hoisted(() => ({
  mockContainerResolve: vi.fn(),
  mockSelect: vi.fn(),
  mockMessages: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    newline: vi.fn(),
  },
  mockGetSettings: vi.fn(),
}));

vi.mock('@/infrastructure/di/container.js', () => ({
  container: { resolve: (...args: unknown[]) => mockContainerResolve(...args) },
}));

vi.mock('@inquirer/prompts', () => ({
  select: (...args: unknown[]) => mockSelect(...args),
}));

vi.mock('../../../../../../src/presentation/cli/ui/index.js', () => ({
  messages: mockMessages,
}));

vi.mock('@/infrastructure/services/settings.service.js', () => ({
  getSettings: () => mockGetSettings(),
  resetSettings: vi.fn(),
  initializeSettings: vi.fn(),
}));

import { createPermissionsCommand } from '../../../../../../src/presentation/cli/commands/settings/permissions.command.js';

function makeSettings(overrides?: { agentType?: string; permissions?: Record<string, string> }) {
  return {
    id: 'settings-id',
    models: { default: 'claude-sonnet-4-6' },
    agent: {
      type: overrides?.agentType ?? AgentType.ClaudeCode,
      authMethod: AgentAuthMethod.Session,
      permissions: overrides?.permissions ?? {},
    },
    user: {},
    environment: { defaultEditor: 'vscode', shellPreference: 'bash' },
    system: { autoUpdate: true, logLevel: 'info' },
    workflow: {
      openPrOnImplementationComplete: false,
      approvalGateDefaults: {
        allowPrd: false,
        allowPlan: false,
        allowMerge: false,
        pushOnImplementationComplete: false,
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeUpdateUseCase() {
  return {
    execute: vi.fn().mockImplementation((settings: unknown) => Promise.resolve(settings)),
  };
}

describe('createPermissionsCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;
    mockGetSettings.mockReturnValue(makeSettings());
  });

  describe('command structure', () => {
    it('returns a Commander Command instance', () => {
      const cmd = createPermissionsCommand();
      expect(cmd).toBeInstanceOf(Command);
    });

    it('has name "permissions"', () => {
      const cmd = createPermissionsCommand();
      expect(cmd.name()).toBe('permissions');
    });

    it('has a description', () => {
      const cmd = createPermissionsCommand();
      expect(cmd.description()).toBeTruthy();
    });
  });

  describe('non-interactive mode', () => {
    it('sets permission mode when --agent and --mode are valid', async () => {
      const updateUseCase = makeUpdateUseCase();
      mockContainerResolve.mockReturnValue(updateUseCase);

      const cmd = createPermissionsCommand();
      await cmd.parseAsync(['--agent', 'claude-code', '--mode', 'plan'], { from: 'user' });

      expect(updateUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          agent: expect.objectContaining({
            permissions: expect.objectContaining({ claudeCode: 'plan' }),
          }),
        })
      );
      expect(mockMessages.success).toHaveBeenCalledWith(expect.stringContaining('plan'));
    });

    it('rejects invalid mode for the agent', async () => {
      const cmd = createPermissionsCommand();
      await cmd.parseAsync(['--agent', 'cursor', '--mode', 'bypassPermissions'], { from: 'user' });

      expect(process.exitCode).toBe(1);
      expect(mockMessages.error).toHaveBeenCalledWith(expect.stringContaining('bypassPermissions'));
    });

    it('requires --mode when --agent is provided without --reset', async () => {
      const cmd = createPermissionsCommand();
      await cmd.parseAsync(['--agent', 'claude-code'], { from: 'user' });

      expect(process.exitCode).toBe(1);
      expect(mockMessages.error).toHaveBeenCalled();
    });

    it('rejects unknown agent type', async () => {
      const cmd = createPermissionsCommand();
      await cmd.parseAsync(['--agent', 'unknown-agent', '--mode', 'default'], { from: 'user' });

      expect(process.exitCode).toBe(1);
      expect(mockMessages.error).toHaveBeenCalled();
    });
  });

  describe('--reset flag', () => {
    it('clears the permission override for the specified agent', async () => {
      const settingsWithPerm = makeSettings({
        permissions: { claudeCode: 'plan' },
      });
      mockGetSettings.mockReturnValue(settingsWithPerm);
      const updateUseCase = makeUpdateUseCase();
      mockContainerResolve.mockReturnValue(updateUseCase);

      const cmd = createPermissionsCommand();
      await cmd.parseAsync(['--agent', 'claude-code', '--reset'], { from: 'user' });

      expect(updateUseCase.execute).toHaveBeenCalled();
      expect(mockMessages.success).toHaveBeenCalledWith(expect.stringContaining('reset'));
    });

    it('uses current agent when --agent is not specified with --reset', async () => {
      const settingsWithPerm = makeSettings({
        permissions: { claudeCode: 'plan' },
      });
      mockGetSettings.mockReturnValue(settingsWithPerm);
      const updateUseCase = makeUpdateUseCase();
      mockContainerResolve.mockReturnValue(updateUseCase);

      const cmd = createPermissionsCommand();
      await cmd.parseAsync(['--reset'], { from: 'user' });

      expect(updateUseCase.execute).toHaveBeenCalled();
      expect(mockMessages.success).toHaveBeenCalled();
    });
  });

  describe('interactive mode', () => {
    it('shows current agent and mode, then prompts for selection', async () => {
      const updateUseCase = makeUpdateUseCase();
      mockContainerResolve.mockReturnValue(updateUseCase);
      mockSelect.mockResolvedValue('plan');

      const cmd = createPermissionsCommand();
      await cmd.parseAsync([], { from: 'user' });

      expect(mockMessages.info).toHaveBeenCalledWith(expect.stringContaining('claude-code'));
      expect(mockSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          choices: expect.arrayContaining([
            expect.objectContaining({ value: 'bypassPermissions' }),
            expect.objectContaining({ value: 'plan' }),
          ]),
        })
      );
      expect(mockMessages.success).toHaveBeenCalledWith(expect.stringContaining('plan'));
    });
  });

  describe('error handling', () => {
    it('sets exit code 1 on use case error', async () => {
      const updateUseCase = { execute: vi.fn().mockRejectedValue(new Error('DB error')) };
      mockContainerResolve.mockReturnValue(updateUseCase);
      mockSelect.mockResolvedValue('plan');

      const cmd = createPermissionsCommand();
      await cmd.parseAsync([], { from: 'user' });

      expect(process.exitCode).toBe(1);
    });

    it('handles user cancellation (Ctrl+C) gracefully', async () => {
      mockContainerResolve.mockReturnValue(makeUpdateUseCase());
      mockSelect.mockRejectedValue(new Error('User force closed the prompt'));

      const cmd = createPermissionsCommand();
      await cmd.parseAsync([], { from: 'user' });

      expect(process.exitCode).toBeUndefined();
      expect(mockMessages.info).toHaveBeenCalledWith(expect.stringContaining('cancelled'));
    });
  });
});
