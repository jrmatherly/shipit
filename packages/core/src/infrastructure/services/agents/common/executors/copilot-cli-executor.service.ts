/**
 * Copilot CLI Executor Service
 *
 * Infrastructure implementation of IAgentExecutor for the GitHub Copilot CLI agent.
 * Executes prompts via the `copilot` CLI subprocess in non-interactive mode.
 *
 * Uses constructor dependency injection for the spawn function
 * to enable testability without mocking node:child_process directly.
 */

import type {
  AgentType,
  AgentFeature,
  CopilotPermissionMode,
} from '../../../../../domain/generated/output.js';
import type {
  AgentExecutionOptions,
  AgentExecutionResult,
  AgentExecutionStreamEvent,
} from '../../../../../application/ports/output/agents/agent-executor.interface.js';
import type { SpawnFunction } from '../types.js';
import { ExecutorBase } from './executor-base.js';

/** Features supported by Copilot CLI */
const SUPPORTED_FEATURES = new Set<string>(['streaming', 'tool-scoping']);

/**
 * Executor service for GitHub Copilot CLI agent.
 * Uses subprocess spawning to interact with the `copilot` CLI.
 */
export class CopilotCliExecutorService extends ExecutorBase {
  readonly agentType: AgentType = 'copilot-cli' as AgentType;

  constructor(spawn: SpawnFunction) {
    super(spawn);
  }

  supportsFeature(feature: AgentFeature): boolean {
    return SUPPORTED_FEATURES.has(feature as string);
  }

  async execute(prompt: string, options?: AgentExecutionOptions): Promise<AgentExecutionResult> {
    this.silent = options?.silent ?? false;
    const args = this.buildArgs(prompt, options);
    const spawnOpts = this.buildSpawnOptions(options);

    this.log(
      `Spawning: copilot ${args.map((a) => (a.length > 80 ? `${a.slice(0, 77)}...` : a)).join(' ')}`
    );
    this.log(`Spawn cwd: ${(spawnOpts.cwd as string) ?? '(inherited)'}`);

    const proc = this.spawn('copilot', args, spawnOpts);
    this.log(`Subprocess PID: ${proc.pid ?? 'undefined (spawn may have failed)'}`);
    this.log(`Prompt length: ${prompt.length} chars`);

    return new Promise<AgentExecutionResult>((resolve, reject) => {
      let stdout = '';

      const timeout = this.createTimeoutHandler(proc, options?.timeout);
      const stderrHandler = this.createStderrHandler();

      proc.stdout?.on('data', (chunk: Buffer | string) => {
        stdout += chunk.toString();
      });

      proc.stderr?.on('data', stderrHandler.handler);

      proc.on('error', (error: Error & { code?: string }) => {
        reject(
          this.handleProcessError(
            error,
            timeout.clear,
            'Copilot CLI ("copilot") not found',
            'Please install it: https://docs.github.com/en/copilot/github-copilot-in-the-cli'
          )
        );
      });

      proc.on('close', (code: number | null) => {
        const stderr = stderrHandler.getStderr();
        this.log(`Process closed with code ${code}, stdout=${stdout.length} chars`);
        timeout.clear();

        if (timeout.isTimedOut()) {
          reject(new Error('Agent execution timed out'));
          return;
        }

        if (code !== 0 && code !== null) {
          const message = stderr.trim()
            ? `Process exited with code ${code}: ${stderr.trim()}`
            : `Process exited with code ${code}`;
          reject(new Error(message));
          return;
        }

        if (!stdout.trim()) {
          reject(new Error(`Empty response from Copilot CLI. stderr: ${stderr.slice(0, 300)}`));
          return;
        }

        const result: AgentExecutionResult = { result: stdout.trim() };
        resolve(result);
      });
    });
  }

  async *executeStream(
    prompt: string,
    options?: AgentExecutionOptions
  ): AsyncIterable<AgentExecutionStreamEvent> {
    this.silent = options?.silent ?? false;
    const args = this.buildArgs(prompt, options);
    const spawnOpts = this.buildSpawnOptions(options);
    const proc = this.spawn('copilot', args, spawnOpts);

    const q = this.createStreamQueue();
    const stderrHandler = this.createStderrHandler();
    let timedOut = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let error: Error | null = null;

    if (options?.timeout) {
      timeoutId = setTimeout(() => {
        timedOut = true;
        proc.kill();
        q.enqueue({ type: 'error', content: 'Agent execution timed out', timestamp: new Date() });
        q.enqueue(null);
      }, options.timeout);
    }

    const lineBuffer = this.createLineBufferHandler((line) => {
      q.enqueue({ type: 'progress', content: line, timestamp: new Date() });
    });

    proc.stdout?.on('data', lineBuffer.handler);
    proc.stderr?.on('data', stderrHandler.handler);

    proc.on('error', (err: Error) => {
      if (timeoutId) clearTimeout(timeoutId);
      error = err;
      q.enqueue(null);
    });

    proc.on('close', (code: number | null) => {
      if (timeoutId) clearTimeout(timeoutId);
      if (timedOut) return; // already handled by timeout callback

      lineBuffer.flush();

      const stderr = stderrHandler.getStderr();
      if (code !== 0 && code !== null) {
        const msg = stderr.trim()
          ? `Process exited with code ${code}: ${stderr.trim()}`
          : `Process exited with code ${code}`;
        q.enqueue({ type: 'error', content: msg, timestamp: new Date() });
      }
      q.enqueue(null);
    });

    // Yield events as they arrive
    while (true) {
      await q.waitForItem();
      const item = q.shift();
      if (item === null || item === undefined) {
        if (error !== null) {
          yield {
            type: 'error' as const,
            content: (error as Error).message,
            timestamp: new Date(),
          };
        }
        return;
      }
      yield item;
    }
  }

  /**
   * Build CLI arguments for copilot execution.
   *
   * `copilot -s -p "prompt" [--model MODEL] [--yolo]`
   *
   * -s: silent (non-interactive) mode
   * -p: prompt text
   */
  private buildArgs(prompt: string, options?: AgentExecutionOptions): string[] {
    const mode = (options?.permissionMode as CopilotPermissionMode) ?? 'yolo';
    const args = ['-s', '-p', prompt];

    if (options?.model) args.push('--model', options.model);

    switch (mode) {
      case 'yolo':
        args.push('--yolo');
        break;
      case 'allow-paths':
        args.push('--allow-all-paths');
        break;
      case 'prompt':
        // No flag — Copilot prompts for approval
        break;
    }

    return args;
  }
}
