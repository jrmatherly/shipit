/**
 * Agent Select Prompt Config Unit Tests
 *
 * TDD Phase: RED -> GREEN
 * Verifies that deprecated agents (dev, aider, continue) are excluded from the prompt.
 */

import { describe, it, expect } from 'vitest';
import { createAgentSelectConfig } from '../../../../../src/presentation/tui/prompts/agent-select.prompt.js';
import { AgentType } from '../../../../../packages/core/src/domain/generated/output.js';

describe('createAgentSelectConfig', () => {
  it('does not include a removed agent type', () => {
    const config = createAgentSelectConfig();
    const devChoice = config.choices.find((c) => c.value === ('dev' as any));
    expect(devChoice).toBeUndefined();
  });

  it('does not include the Aider agent', () => {
    const config = createAgentSelectConfig();
    const aiderChoice = config.choices.find((c) => c.value === AgentType.Aider);
    expect(aiderChoice).toBeUndefined();
  });

  it('does not include the Continue agent', () => {
    const config = createAgentSelectConfig();
    const continueChoice = config.choices.find((c) => c.value === AgentType.Continue);
    expect(continueChoice).toBeUndefined();
  });

  it('includes only supported agents', () => {
    const config = createAgentSelectConfig();
    const supportedValues = config.choices.map((c) => c.value);
    expect(supportedValues).toContain(AgentType.ClaudeCode);
    expect(supportedValues).toContain(AgentType.GeminiCli);
    expect(supportedValues).toContain(AgentType.CodexCli);
    expect(supportedValues).toContain(AgentType.Cursor);
    expect(supportedValues).toContain(AgentType.CopilotCli);
    expect(supportedValues).toContain(AgentType.RovoDev);
  });

  it('no choices are disabled', () => {
    const config = createAgentSelectConfig();
    const disabledChoices = config.choices.filter((c) => (c as { disabled?: unknown }).disabled);
    expect(disabledChoices).toHaveLength(0);
  });
});
