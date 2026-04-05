/**
 * Permission Modes Validation Helper Unit Tests
 *
 * Tests for getValidModesForAgent — ensures each agent type returns
 * the correct set of valid permission mode strings from the TypeSpec enums.
 *
 * TDD Phase: RED -> GREEN
 */

import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { getValidModesForAgent } from '../../../../../../src/presentation/cli/commands/settings/permission-modes.js';

describe('getValidModesForAgent', () => {
  describe('claude-code', () => {
    it('returns all 4 ClaudeCodePermissionMode values', () => {
      const modes = getValidModesForAgent('claude-code');
      expect(modes).toEqual(['default', 'acceptEdits', 'plan', 'bypassPermissions']);
    });

    it('includes bypassPermissions', () => {
      const modes = getValidModesForAgent('claude-code');
      expect(modes).toContain('bypassPermissions');
    });
  });

  describe('cursor', () => {
    it('returns propose and yolo', () => {
      const modes = getValidModesForAgent('cursor');
      expect(modes).toEqual(['propose', 'yolo']);
    });
  });

  describe('gemini-cli', () => {
    it('returns default, auto_edit, and yolo', () => {
      const modes = getValidModesForAgent('gemini-cli');
      expect(modes).toEqual(['default', 'auto_edit', 'yolo']);
    });
  });

  describe('codex-cli', () => {
    it('returns read-only, workspace-write, and danger-full-access', () => {
      const modes = getValidModesForAgent('codex-cli');
      expect(modes).toEqual(['read-only', 'workspace-write', 'danger-full-access']);
    });
  });

  describe('copilot-cli', () => {
    it('returns prompt, allow-paths, and yolo', () => {
      const modes = getValidModesForAgent('copilot-cli');
      expect(modes).toEqual(['prompt', 'allow-paths', 'yolo']);
    });
  });

  describe('rovo-dev', () => {
    it('returns config, shadow, and yolo', () => {
      const modes = getValidModesForAgent('rovo-dev');
      expect(modes).toEqual(['config', 'shadow', 'yolo']);
    });
  });

  describe('unknown agent', () => {
    it('returns empty array for unknown agent type', () => {
      const modes = getValidModesForAgent('unknown-agent');
      expect(modes).toEqual([]);
    });

    it('returns empty array for empty string', () => {
      const modes = getValidModesForAgent('');
      expect(modes).toEqual([]);
    });
  });

  describe('cross-agent validation', () => {
    it('bypassPermissions is valid for claude-code but not for cursor', () => {
      expect(getValidModesForAgent('claude-code')).toContain('bypassPermissions');
      expect(getValidModesForAgent('cursor')).not.toContain('bypassPermissions');
    });

    it('yolo is valid for cursor but not for claude-code', () => {
      expect(getValidModesForAgent('cursor')).toContain('yolo');
      expect(getValidModesForAgent('claude-code')).not.toContain('yolo');
    });

    it('danger-full-access is valid only for codex-cli', () => {
      expect(getValidModesForAgent('codex-cli')).toContain('danger-full-access');
      expect(getValidModesForAgent('claude-code')).not.toContain('danger-full-access');
      expect(getValidModesForAgent('cursor')).not.toContain('danger-full-access');
      expect(getValidModesForAgent('gemini-cli')).not.toContain('danger-full-access');
    });
  });
});
