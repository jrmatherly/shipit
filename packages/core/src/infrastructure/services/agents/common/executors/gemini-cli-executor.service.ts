/**
 * Gemini CLI Executor Service
 *
 * Infrastructure implementation of IAgentExecutor for the Gemini CLI agent.
 * Executes prompts via the `gemini` CLI subprocess with JSON output format.
 *
 * Uses constructor dependency injection for the spawn function
 * to enable testability without mocking node:child_process directly.
 */

import type {
  AgentType,
  AgentFeature,
  AgentConfig,
} from '../../../../../domain/generated/output.js';
import type {
  AgentExecutionOptions,
  AgentExecutionResult,
  AgentExecutionStreamEvent,
} from '../../../../../application/ports/output/agents/agent-executor.interface.js';
import type { SpawnFunction } from '../types.js';
import { ExecutorBase } from './executor-base.js';

/** Features supported by Gemini CLI */
const SUPPORTED_FEATURES = new Set<string>(['session-resume', 'streaming', 'tool-scoping']);

/**
 * Executor service for Gemini CLI agent.
 * Uses subprocess spawning to interact with the `gemini` CLI.
 */
export class GeminiCliExecutorService extends ExecutorBase {
  readonly agentType: AgentType = 'gemini-cli' as AgentType;

  private readonly authConfig?: AgentConfig;

  constructor(spawn: SpawnFunction, authConfig?: AgentConfig) {
    super(spawn);
    this.authConfig = authConfig;
  }

  supportsFeature(feature: AgentFeature): boolean {
    return SUPPORTED_FEATURES.has(feature as string);
  }

  async execute(prompt: string, options?: AgentExecutionOptions): Promise<AgentExecutionResult> {
    this.silent = options?.silent ?? false;
    const args = this.buildArgs(prompt, options, 'json');
    const spawnOpts = this.buildSpawnOptions(options);

    this.log(
      `Spawning: gemini ${args.map((a) => (a.length > 80 ? `${a.slice(0, 77)}...` : a)).join(' ')}`
    );
    this.log(`Spawn cwd: ${(spawnOpts.cwd as string) ?? '(inherited)'}`);

    const proc = this.spawn('gemini', args, spawnOpts);
    this.log(`Subprocess PID: ${proc.pid ?? 'undefined (spawn may have failed)'}`);
    this.log(`Prompt length: ${prompt.length} chars (piped via stdin)`);

    // Pipe the prompt via stdin to avoid ENAMETOOLONG on Windows.
    if (proc.stdin) {
      proc.stdin.write(prompt);
      proc.stdin.end();
    }

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
            'Gemini CLI ("gemini") not found',
            'Please install it: https://github.com/google-gemini/gemini-cli'
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

        // Gemini CLI may exit 0 despite fatal API errors (e.g. 429 rate limits).
        // Check stderr for known fatal patterns before trusting the output.
        const fatalError = this.detectFatalStderrError(stderr);
        if (fatalError) {
          reject(new Error(fatalError));
          return;
        }

        try {
          const parsed = JSON.parse(stdout);
          const result: AgentExecutionResult = { result: parsed.response ?? '' };

          if (parsed.session_id) result.sessionId = parsed.session_id;

          const usage = this.extractUsage(parsed);
          if (usage) result.usage = usage;

          resolve(result);
        } catch {
          reject(new Error(`Failed to parse Gemini JSON output: ${stdout.slice(0, 200)}`));
        }
      });
    });
  }

  async *executeStream(
    prompt: string,
    options?: AgentExecutionOptions
  ): AsyncIterable<AgentExecutionStreamEvent> {
    this.silent = options?.silent ?? false;
    const args = this.buildArgs(prompt, options, 'stream-json');
    const spawnOpts = this.buildSpawnOptions(options);
    const proc = this.spawn('gemini', args, spawnOpts);

    // Pipe the prompt via stdin to avoid ENAMETOOLONG on Windows.
    if (proc.stdin) {
      proc.stdin.write(prompt);
      proc.stdin.end();
    }

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
      const event = this.parseStreamEvent(line);
      if (event) q.enqueue(event);
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
      } else {
        // Gemini CLI may exit 0 despite fatal API errors (e.g. 429 rate limits)
        const fatalError = this.detectFatalStderrError(stderr);
        if (fatalError) {
          q.enqueue({ type: 'error', content: fatalError, timestamp: new Date() });
        }
      }
      q.enqueue(null);
    });

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
   * Parse a single stream-JSON line into an AgentExecutionStreamEvent.
   * Returns null for events that should be skipped (init, user messages, unknown types).
   */
  private parseStreamEvent(line: string): AgentExecutionStreamEvent | null {
    try {
      const parsed = JSON.parse(line) as Record<string, unknown>;
      const type = parsed.type as string;

      switch (type) {
        case 'init':
          return null;
        case 'message':
          if (parsed.role === 'user') return null;
          if (parsed.role === 'assistant' && parsed.delta) {
            return {
              type: 'progress',
              content: (parsed.content as string) ?? '',
              timestamp: new Date(),
            };
          }
          return null;
        case 'tool_use':
          return {
            type: 'progress',
            content: `[tool_use: ${parsed.tool_name}]`,
            timestamp: new Date(),
          };
        case 'tool_result':
          return {
            type: 'progress',
            content: `[tool_result: ${parsed.status}]`,
            timestamp: new Date(),
          };
        case 'result':
          return {
            type: 'result',
            content: (parsed.response as string) ?? '',
            timestamp: new Date(),
          };
        case 'error':
          return {
            type: 'error',
            content: (parsed.message as string) ?? '',
            timestamp: new Date(),
          };
        default:
          return null;
      }
    } catch {
      // Non-JSON line — emit as raw progress
      return { type: 'progress', content: line, timestamp: new Date() };
    }
  }

  /**
   * Patterns in stderr that indicate a fatal API error even when exit code is 0.
   * Gemini CLI sometimes exits 0 after exhausting retries on 429/5xx errors.
   */
  private static readonly FATAL_STDERR_PATTERNS = [
    /RESOURCE_EXHAUSTED/i,
    /failed with status 4\d{2}\. Retrying/i,
    /failed with status 5\d{2}\. Retrying/i,
  ];

  /**
   * Check stderr for patterns indicating fatal API errors.
   * Returns an error message if fatal patterns are found, null otherwise.
   */
  private detectFatalStderrError(stderr: string): string | null {
    for (const pattern of GeminiCliExecutorService.FATAL_STDERR_PATTERNS) {
      if (pattern.test(stderr)) {
        // Extract a concise summary from the noisy stderr
        const lines = stderr.split('\n').filter((l) => l.trim());
        const summary = lines.slice(0, 3).join(' | ').slice(0, 300);
        return `Gemini CLI exited 0 but fatal error detected in stderr: ${summary}`;
      }
    }
    return null;
  }

  /**
   * Extract token usage from Gemini stats structure.
   * Returns undefined if stats are missing (does not throw).
   */
  private extractUsage(
    parsed: Record<string, unknown>
  ): { inputTokens: number; outputTokens: number } | undefined {
    const stats = parsed.stats as Record<string, unknown> | undefined;
    if (!stats?.models) return undefined;

    const models = stats.models as Record<string, Record<string, unknown>>;
    const firstModel = Object.values(models)[0];
    if (!firstModel?.tokens) return undefined;

    const tokens = firstModel.tokens as Record<string, number>;
    if (tokens.prompt === undefined || tokens.candidates === undefined) return undefined;

    return { inputTokens: tokens.prompt, outputTokens: tokens.candidates };
  }

  private buildArgs(
    _prompt: string,
    options?: AgentExecutionOptions,
    outputFormat = 'json'
  ): string[] {
    // Prompt is piped via stdin — not passed as a CLI argument — to avoid
    // ENAMETOOLONG on Windows when prompts exceed the ~32 KB arg-length limit.
    const args = ['-p', '--output-format', outputFormat, '-y'];

    if (options?.resumeSession) args.push('--resume', options.resumeSession);
    if (options?.model) args.push('-m', options.model);
    if (options?.allowedTools?.length) args.push('--allowed-tools', options.allowedTools.join(','));

    // Unsupported options silently omitted: maxTurns, disableMcp
    if (options?.systemPrompt) {
      this.log('systemPrompt option is not supported by Gemini CLI — ignoring');
    }
    if (options?.outputSchema) {
      this.log('outputSchema option is not supported by Gemini CLI — ignoring');
    }

    return args;
  }

  protected override buildSpawnEnv(): Record<string, string | undefined> {
    const env = super.buildSpawnEnv();
    if (this.authConfig?.authMethod === 'token' && this.authConfig.token) {
      return { ...env, GEMINI_API_KEY: this.authConfig.token };
    }
    return env;
  }
}
