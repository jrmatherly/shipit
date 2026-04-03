import type { AgentType, AgentFeature } from '../../../../../domain/generated/output.js';
import type {
  IAgentExecutor,
  AgentExecutionOptions,
  AgentExecutionResult,
  AgentExecutionStreamEvent,
} from '../../../../../application/ports/output/agents/agent-executor.interface.js';
import type { SpawnFunction } from '../types.js';
import { getCurrentPhase, getLogPrefix } from '../../feature-agent/log-context.js';
import { IS_WINDOWS } from '../../../../platform.js';

export const MAX_STDERR_BYTES = 100 * 1024; // 100 KB

export abstract class ExecutorBase implements IAgentExecutor {
  abstract readonly agentType: AgentType;

  protected silent = false;

  constructor(protected readonly spawn: SpawnFunction) {}

  abstract execute(prompt: string, options?: AgentExecutionOptions): Promise<AgentExecutionResult>;

  abstract executeStream(
    prompt: string,
    options?: AgentExecutionOptions
  ): AsyncIterable<AgentExecutionStreamEvent>;

  abstract supportsFeature(feature: AgentFeature): boolean;

  protected log(message: string): void {
    if (this.silent) return;
    const ts = new Date().toISOString();
    process.stdout.write(`[${ts}] ${getCurrentPhase()}${getLogPrefix()}${message}\n`);
  }

  protected buildSpawnOptions(options?: AgentExecutionOptions): Record<string, unknown> {
    const spawnOpts: Record<string, unknown> = {};
    if (options?.cwd) spawnOpts.cwd = options.cwd;

    spawnOpts.stdio = ['pipe', 'pipe', 'pipe'];

    if (IS_WINDOWS) {
      spawnOpts.windowsHide = true;
    }

    spawnOpts.env = this.buildSpawnEnv();

    return spawnOpts;
  }

  protected buildSpawnEnv(): Record<string, string | undefined> {
    const { CLAUDECODE: _, ...cleanEnv } = process.env;
    return cleanEnv;
  }

  protected createStderrHandler(): {
    handler: (chunk: Buffer | string) => void;
    getStderr: () => string;
  } {
    let stderr = '';
    return {
      handler: (chunk: Buffer | string) => {
        const data = chunk.toString();
        stderr += data;
        if (stderr.length > MAX_STDERR_BYTES) {
          stderr = stderr.slice(-MAX_STDERR_BYTES);
        }
        this.log(`stderr: ${data.trimEnd()}`);
      },
      getStderr: () => stderr,
    };
  }

  protected createLineBufferHandler(onLine: (line: string) => void): {
    handler: (chunk: Buffer | string) => void;
    flush: () => void;
  } {
    let lineBuffer = '';
    return {
      handler: (chunk: Buffer | string) => {
        lineBuffer += chunk.toString();
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) onLine(trimmed);
        }
      },
      flush: () => {
        if (lineBuffer.trim()) onLine(lineBuffer.trim());
        lineBuffer = '';
      },
    };
  }

  protected createTimeoutHandler(
    proc: { kill: () => void },
    timeoutMs: number | undefined
  ): { isTimedOut: () => boolean; clear: () => void } {
    let timedOut = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (timeoutMs) {
      timeoutId = setTimeout(() => {
        timedOut = true;
        proc.kill();
      }, timeoutMs);
    }

    return {
      isTimedOut: () => timedOut,
      clear: () => {
        if (timeoutId) clearTimeout(timeoutId);
      },
    };
  }

  protected createStreamQueue(): {
    enqueue: (item: AgentExecutionStreamEvent | null) => void;
    waitForItem: () => Promise<void>;
    shift: () => AgentExecutionStreamEvent | null | undefined;
    readonly length: number;
  } {
    const queue: (AgentExecutionStreamEvent | null)[] = [];
    let resolve: (() => void) | null = null;

    return {
      enqueue: (item: AgentExecutionStreamEvent | null) => {
        queue.push(item);
        if (resolve) {
          resolve();
          resolve = null;
        }
      },
      waitForItem: () => {
        if (queue.length > 0) return Promise.resolve();
        return new Promise<void>((r) => {
          resolve = r;
        });
      },
      shift: () => queue.shift(),
      get length() {
        return queue.length;
      },
    };
  }

  protected handleProcessError(
    error: Error & { code?: string },
    timeoutClear: () => void,
    cliName: string,
    installInstructions: string
  ): Error {
    this.log(`Process error event: ${error.message}`);
    timeoutClear();
    if (error.code === 'ENOENT') {
      return new Error(`${cliName}. ${installInstructions}`);
    }
    return error;
  }
}
