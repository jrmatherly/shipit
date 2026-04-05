import type { DependencyContainer } from 'tsyringe';
import type Database from 'better-sqlite3';
import { spawn } from 'node:child_process';

import type { IAgentExecutorFactory } from '../../../application/ports/output/agents/agent-executor-factory.interface.js';
import type { IAgentExecutorProvider } from '../../../application/ports/output/agents/agent-executor-provider.interface.js';
import type { IStructuredAgentCaller } from '../../../application/ports/output/agents/structured-agent-caller.interface.js';
import type { IAgentRegistry } from '../../../application/ports/output/agents/agent-registry.interface.js';
import type { IAgentRunner } from '../../../application/ports/output/agents/agent-runner.interface.js';
import type { IAgentRunRepository } from '../../../application/ports/output/agents/agent-run-repository.interface.js';
import type { IPhaseTimingRepository } from '../../../application/ports/output/agents/phase-timing-repository.interface.js';
import type { IFeatureAgentProcessService } from '../../../application/ports/output/agents/feature-agent-process.interface.js';
import type { ISpecInitializerService } from '../../../application/ports/output/services/spec-initializer.interface.js';
import type { ISettingsRepository } from '../../../application/ports/output/repositories/settings.repository.interface.js';
import type { ISettingsReader } from '../../../application/ports/output/services/settings-reader.interface.js';
import { AgentExecutorFactory } from '../../services/agents/common/agent-executor-factory.service.js';
import { AgentExecutorProvider } from '../../services/agents/common/agent-executor-provider.service.js';
import { StructuredAgentCallerService } from '../../services/agents/common/structured-agent-caller.service.js';
import { MockAgentExecutorFactory } from '../../services/agents/common/executors/mock-executor-factory.service.js';
import { AgentRegistryService } from '../../services/agents/common/agent-registry.service.js';
import { AgentRunnerService } from '../../services/agents/common/agent-runner.service.js';
import { SQLiteAgentRunRepository } from '../../repositories/agent-run.repository.js';
import { SQLitePhaseTimingRepository } from '../../repositories/sqlite-phase-timing.repository.js';
import { FeatureAgentProcessService } from '../../services/agents/feature-agent/feature-agent-process.service.js';
import { SpecInitializerService } from '../../services/spec/spec-initializer.service.js';
import { ClaudeCodeSessionRepository } from '../../services/agents/sessions/claude-code-session.repository.js';
import { CodexCliSessionRepository } from '../../services/agents/sessions/codex-cli-session.repository.js';
import { StubSessionRepository } from '../../services/agents/sessions/stub-session.repository.js';
import { AgentSessionRepositoryRegistry } from '../../../application/services/agents/agent-session-repository.registry.js';
import { ListAgentSessionsUseCase } from '../../../application/use-cases/agents/list-agent-sessions.use-case.js';
import { GetAgentSessionUseCase } from '../../../application/use-cases/agents/get-agent-session.use-case.js';
import { AgentType } from '../../../domain/generated/output.js';

/**
 * Register agent infrastructure: executors, providers, runners, session repos.
 */
export function registerAgentsModule(container: DependencyContainer): void {
  // Agent run & phase timing repositories
  container.register<IAgentRunRepository>('IAgentRunRepository', {
    useFactory: (c) => {
      const database = c.resolve<Database.Database>('Database');
      return new SQLiteAgentRunRepository(database);
    },
  });

  container.register<IPhaseTimingRepository>('IPhaseTimingRepository', {
    useFactory: (c) => {
      const database = c.resolve<Database.Database>('Database');
      return new SQLitePhaseTimingRepository(database);
    },
  });

  // Executor factory (mock or real based on env)
  if (process.env.SHIPIT_AI_MOCK_EXECUTOR === '1') {
    container.register<IAgentExecutorFactory>('IAgentExecutorFactory', {
      useFactory: () => new MockAgentExecutorFactory(),
    });
  } else {
    container.register<IAgentExecutorFactory>('IAgentExecutorFactory', {
      useFactory: () => {
        // Wrap spawn with sensible defaults: stdio piped and windowsHide on Win32.
        // Each executor controls its own `shell` option — cursor needs shell: true
        // for .cmd scripts, but claude-code must NOT use shell (DEP0190 / prompt mangling).
        const spawnWithPipe = (command: string, args: string[], options?: object) => {
          return spawn(command, args, {
            stdio: 'pipe',
            ...(process.platform === 'win32' ? { windowsHide: true } : {}),
            ...options,
          });
        };
        return new AgentExecutorFactory(spawnWithPipe);
      },
    });
  }

  container.register<IAgentExecutorProvider>('IAgentExecutorProvider', {
    useFactory: (c) => {
      const factory = c.resolve<IAgentExecutorFactory>('IAgentExecutorFactory');
      const settingsRepo = c.resolve<ISettingsRepository>('ISettingsRepository');
      return new AgentExecutorProvider(factory, settingsRepo);
    },
  });

  container.register<IStructuredAgentCaller>('IStructuredAgentCaller', {
    useFactory: (c) => {
      const provider = c.resolve<IAgentExecutorProvider>('IAgentExecutorProvider');
      const factory = c.resolve<IAgentExecutorFactory>('IAgentExecutorFactory');
      const settingsReader = c.resolve<ISettingsReader>('ISettingsReader');
      return new StructuredAgentCallerService(provider, factory, settingsReader);
    },
  });

  container.register<IAgentRegistry>('IAgentRegistry', {
    useFactory: () => new AgentRegistryService(),
  });

  container.register<IAgentRunner>('IAgentRunner', {
    useFactory: (c) => {
      const registry = c.resolve<IAgentRegistry>('IAgentRegistry');
      const executorProvider = c.resolve<IAgentExecutorProvider>('IAgentExecutorProvider');
      const runRepository = c.resolve<IAgentRunRepository>('IAgentRunRepository');
      const settingsReader = c.resolve<ISettingsReader>('ISettingsReader');
      return new AgentRunnerService(registry, executorProvider, runRepository, settingsReader);
    },
  });

  container.register<IFeatureAgentProcessService>('IFeatureAgentProcessService', {
    useFactory: (c) => {
      const runRepository = c.resolve<IAgentRunRepository>('IAgentRunRepository');
      return new FeatureAgentProcessService(runRepository);
    },
  });

  container.register<ISpecInitializerService>('ISpecInitializerService', {
    useFactory: () => new SpecInitializerService(),
  });

  // Session repositories (per-AgentType string tokens)
  container.register(`IAgentSessionRepository:${AgentType.ClaudeCode}`, {
    useFactory: () => new ClaudeCodeSessionRepository(),
  });
  container.register(`IAgentSessionRepository:${AgentType.Cursor}`, {
    useFactory: () => new StubSessionRepository(AgentType.Cursor),
  });
  container.register(`IAgentSessionRepository:${AgentType.GeminiCli}`, {
    useFactory: () => new StubSessionRepository(AgentType.GeminiCli),
  });
  container.register(`IAgentSessionRepository:${AgentType.CodexCli}`, {
    useFactory: () => new CodexCliSessionRepository(),
  });
  container.register(`IAgentSessionRepository:${AgentType.CopilotCli}`, {
    useFactory: () => new StubSessionRepository(AgentType.CopilotCli),
  });
  container.register(`IAgentSessionRepository:${AgentType.RovoDev}`, {
    useFactory: () => new StubSessionRepository(AgentType.RovoDev),
  });

  container.registerSingleton(AgentSessionRepositoryRegistry);
  container.registerSingleton(ListAgentSessionsUseCase);
  container.registerSingleton(GetAgentSessionUseCase);
}
