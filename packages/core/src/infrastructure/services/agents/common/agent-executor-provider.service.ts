import type { IAgentExecutorProvider } from '../../../../application/ports/output/agents/agent-executor-provider.interface.js';
import type { IAgentExecutorFactory } from '../../../../application/ports/output/agents/agent-executor-factory.interface.js';
import type { IAgentExecutor } from '../../../../application/ports/output/agents/agent-executor.interface.js';
import type { ISettingsRepository } from '../../../../application/ports/output/repositories/settings.repository.interface.js';
import { ClaudeCodeExecutorService } from './executors/claude-code-executor.service.js';
import { GeminiCliExecutorService } from './executors/gemini-cli-executor.service.js';
import { CodexCliExecutorService } from './executors/codex-cli-executor.service.js';

export class AgentExecutorProvider implements IAgentExecutorProvider {
  constructor(
    private readonly factory: IAgentExecutorFactory,
    private readonly settingsRepository: ISettingsRepository
  ) {}

  async getExecutor(): Promise<IAgentExecutor> {
    const settings = await this.settingsRepository.load();
    if (!settings) {
      throw new Error('Settings not found. Please run initialization first.');
    }
    const executor = this.factory.createExecutor(settings.agent.type, settings.agent);

    // Update proxy config on cached executor so it always has fresh settings
    if (executor instanceof ClaudeCodeExecutorService) {
      executor.updateProxyConfig(settings.litellmProxy);
    } else if (executor instanceof GeminiCliExecutorService) {
      executor.updateProxyConfig(settings.litellmProxy);
    } else if (executor instanceof CodexCliExecutorService) {
      executor.updateProxyConfig(settings.litellmProxy);
    }

    return executor;
  }
}
