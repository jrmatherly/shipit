/**
 * Claude Code Executor Service
 *
 * Infrastructure implementation of IAgentExecutor for Claude Code agent.
 * Executes prompts via the `claude` CLI subprocess with JSON and stream-json
 * output formats.
 *
 * Uses constructor dependency injection for the spawn function
 * to enable testability without mocking node:child_process directly.
 */

import type { AgentType, AgentFeature } from '../../../../../domain/generated/output.js';
import type {
  AgentExecutionOptions,
  AgentExecutionResult,
  AgentExecutionUsage,
  AgentExecutionStreamEvent,
} from '../../../../../application/ports/output/agents/agent-executor.interface.js';
import type { SpawnFunction } from '../types.js';
import { ExecutorBase } from './executor-base.js';

/** Features supported by Claude Code CLI */
const SUPPORTED_FEATURES = new Set<string>([
  'session-resume',
  'streaming',
  'system-prompt',
  'structured-output',
  'session-listing',
]);

/**
 * Executor service for Claude Code agent.
 * Uses subprocess spawning to interact with the `claude` CLI.
 */
export class ClaudeCodeExecutorService extends ExecutorBase {
  readonly agentType: AgentType = 'claude-code' as AgentType;

  constructor(spawn: SpawnFunction) {
    super(spawn);
  }

  async execute(prompt: string, options?: AgentExecutionOptions): Promise<AgentExecutionResult> {
    this.silent = options?.silent ?? false;
    // Use stream-json so we get real-time events in the worker log
    // instead of zero output for minutes with --output-format json
    const args = this.buildStreamArgs(prompt, options);
    const spawnOpts = this.buildSpawnOptions(options);

    this.log(
      `Spawning: claude ${args.map((a) => (a.length > 80 ? `${a.slice(0, 77)}...` : a)).join(' ')}`
    );
    this.log(`Spawn cwd: ${(spawnOpts.cwd as string) ?? '(inherited)'}`);

    const proc = this.spawn('claude', args, spawnOpts);

    this.log(`Subprocess PID: ${proc.pid ?? 'undefined (spawn may have failed)'}`);
    this.log(`Prompt length: ${prompt.length} chars (piped via stdin)`);

    // Pipe the prompt via stdin to avoid ENAMETOOLONG on Windows.
    if (proc.stdin) {
      proc.stdin.write(prompt);
      proc.stdin.end();
    }

    return new Promise<AgentExecutionResult>((resolve, reject) => {
      // Collected from the stream — only the final result line matters
      let resultText = '';
      let sessionId: string | undefined;
      let usage: { inputTokens: number; outputTokens: number } | undefined;
      let metadata: Record<string, unknown> | undefined;

      const timeout = this.createTimeoutHandler(proc, options?.timeout);
      const stderrHandler = this.createStderrHandler();

      const processLine = (line: string) => {
        this.logStreamEvent(line);
        try {
          const parsed = JSON.parse(line);
          if (parsed.type === 'result') {
            resultText = parsed.result ?? '';
            if (parsed.session_id) sessionId = parsed.session_id;
            usage = this.extractUsage(parsed);

            const { type: _t, result: _r, session_id: _s, usage: _u, ...rest } = parsed;
            if (Object.keys(rest).length > 0) metadata = rest;
          }
        } catch {
          /* not JSON — already logged by logStreamEvent */
        }
      };

      const lineBuffer = this.createLineBufferHandler(processLine);

      proc.stdout?.on('data', lineBuffer.handler);
      proc.stderr?.on('data', stderrHandler.handler);

      proc.on('error', (error: Error & { code?: string }) => {
        reject(
          this.handleProcessError(
            error,
            timeout.clear,
            'Claude Code CLI ("claude") not found',
            'Please install it: https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview'
          )
        );
      });

      proc.on('close', (code: number | null) => {
        lineBuffer.flush();

        const stderr = stderrHandler.getStderr();
        this.log(`Process closed with code ${code}, result=${resultText.length} chars`);
        timeout.clear();

        if (timeout.isTimedOut()) {
          reject(new Error('Agent execution timed out'));
          return;
        }

        if (code !== 0 && code !== null) {
          reject(new Error(stderr.trim() || `Process exited with code ${code}`));
          return;
        }

        const result: AgentExecutionResult = { result: resultText };
        if (sessionId) result.sessionId = sessionId;
        if (usage) result.usage = usage;
        if (metadata) result.metadata = metadata;
        resolve(result);
      });
    });
  }

  async *executeStream(
    prompt: string,
    options?: AgentExecutionOptions
  ): AsyncIterable<AgentExecutionStreamEvent> {
    const args = this.buildStreamArgs(prompt, options);
    const spawnOpts = this.buildSpawnOptions(options);
    const proc = this.spawn('claude', args, spawnOpts);

    // Pipe the prompt via stdin to avoid ENAMETOOLONG on Windows.
    if (proc.stdin) {
      proc.stdin.write(prompt);
      proc.stdin.end();
    }

    const q = this.createStreamQueue();
    const stderrHandler = this.createStderrHandler();
    let error: Error | null = null;

    const lineBuffer = this.createLineBufferHandler((line) => {
      const event = this.parseStreamLine(line);
      if (event) q.enqueue(event);
    });

    proc.stdout?.on('data', lineBuffer.handler);

    proc.stderr?.on('data', stderrHandler.handler);

    proc.on('error', (err: Error) => {
      error = err;
      q.enqueue(null); // signal end
    });

    proc.on('close', (code: number | null) => {
      lineBuffer.flush();

      const stderr = stderrHandler.getStderr();
      if (code !== 0 && code !== null && stderr.trim()) {
        q.enqueue({
          type: 'error',
          content: stderr.trim(),
          timestamp: new Date(),
        });
      }
      q.enqueue(null); // signal end
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
   * Log a stream-json line as a human-readable event in the worker log.
   * Extracts tool calls, assistant text, and result summaries.
   */
  private logStreamEvent(line: string): void {
    try {
      const parsed = JSON.parse(line);

      // Assistant messages contain tool_use and text blocks
      if (parsed.type === 'assistant' && Array.isArray(parsed.message?.content)) {
        for (const block of parsed.message.content) {
          if (block.type === 'tool_use') {
            const inputJson = JSON.stringify(block.input ?? {});
            this.log(`[tool] ${block.name} ${inputJson}`);
          } else if (block.type === 'text' && block.text?.trim()) {
            this.log(`[text] ${block.text.trim().replace(/\n/g, ' ')}`);
          }
        }
        return;
      }

      // Final result — summary with session and token info
      if (parsed.type === 'result') {
        this.log(
          `[result] ${(parsed.result ?? '').length} chars, session=${parsed.session_id ?? 'none'}`
        );
        const u = parsed.usage;
        if (u) {
          const inTokens =
            (u.input_tokens ?? 0) +
            (u.cache_creation_input_tokens ?? 0) +
            (u.cache_read_input_tokens ?? 0);
          const costStr =
            parsed.total_cost_usd != null ? `, $${Number(parsed.total_cost_usd).toFixed(4)}` : '';
          this.log(`[tokens] ${inTokens} in / ${u.output_tokens ?? 0} out${costStr}`);
        }
        return;
      }
    } catch {
      // Non-JSON line — log it raw
      if (line.length > 0) {
        this.log(`[raw] ${line}`);
      }
    }
  }

  supportsFeature(feature: AgentFeature): boolean {
    return SUPPORTED_FEATURES.has(feature as string);
  }

  private buildArgs(_prompt: string, options?: AgentExecutionOptions): string[] {
    // Prompt is piped via stdin — not passed as a CLI argument — to avoid
    // ENAMETOOLONG on Windows when prompts exceed the ~32 KB arg-length limit.
    const args = ['-p', '--output-format', 'json', '--dangerously-skip-permissions'];
    if (options?.resumeSession) args.push('--resume', options.resumeSession);
    if (options?.model) args.push('--model', options.model);
    if (options?.systemPrompt) args.push('--append-system-prompt', options.systemPrompt);
    if (options?.allowedTools?.length) args.push('--allowedTools', options.allowedTools.join(','));
    if (options?.outputSchema) args.push('--json-schema', JSON.stringify(options.outputSchema));
    if (options?.maxTurns) args.push('--max-turns', String(options.maxTurns));
    if (options?.disableMcp) args.push('--strict-mcp-config');
    if (options?.tools?.length) args.push('--tools', options.tools.join(','));
    return args;
  }

  private buildStreamArgs(prompt: string, options?: AgentExecutionOptions): string[] {
    const args = this.buildArgs(prompt, options);
    const fmtIdx = args.indexOf('--output-format');
    if (fmtIdx !== -1) args[fmtIdx + 1] = 'stream-json';
    // stream-json requires --verbose and --include-partial-messages when using -p (--print)
    // --no-chrome ensures it runs in non-interactive mode without browser integration
    args.push('--verbose', '--include-partial-messages', '--no-chrome');
    return args;
  }

  private parseJsonResult(stdout: string): AgentExecutionResult {
    const trimmed = stdout.trim();

    try {
      const parsed = JSON.parse(trimmed);
      const result: AgentExecutionResult = {
        result: parsed.result ?? trimmed,
      };

      if (parsed.session_id) {
        result.sessionId = parsed.session_id;
      }

      const usage = this.extractUsage(parsed);
      if (usage) result.usage = usage;

      // Store additional metadata
      const { result: _r, session_id: _s, usage: _u, ...rest } = parsed;
      if (Object.keys(rest).length > 0) {
        result.metadata = rest;
      }

      return result;
    } catch {
      // If stdout is not valid JSON, treat it as raw text result
      return { result: trimmed };
    }
  }

  /**
   * Extract token usage and execution stats from a Claude Code CLI result object.
   * Tokens live inside `parsed.usage`; cost/turns/apiDuration at the top level.
   */
  private extractUsage(parsed: Record<string, unknown>): AgentExecutionUsage | undefined {
    const u = parsed.usage as Record<string, number> | undefined;
    if (u?.output_tokens === undefined) return undefined;

    const cacheCreation = u.cache_creation_input_tokens ?? 0;
    const cacheRead = u.cache_read_input_tokens ?? 0;
    const inputTokens = (u.input_tokens ?? 0) + cacheCreation + cacheRead;

    const usage: AgentExecutionUsage = { inputTokens, outputTokens: u.output_tokens };

    if (cacheCreation > 0) usage.cacheCreationInputTokens = cacheCreation;
    if (cacheRead > 0) usage.cacheReadInputTokens = cacheRead;

    // Top-level fields from the result object
    if (typeof parsed.total_cost_usd === 'number') usage.costUsd = parsed.total_cost_usd;
    if (typeof parsed.num_turns === 'number') usage.numTurns = parsed.num_turns;
    if (typeof parsed.duration_api_ms === 'number') usage.durationApiMs = parsed.duration_api_ms;

    return usage;
  }

  private parseStreamLine(line: string): AgentExecutionStreamEvent | null {
    try {
      const parsed = JSON.parse(line);

      // Handle Claude Code stream_json format with nested events
      if (parsed.type === 'stream_event' && parsed.event) {
        const { event } = parsed;

        // Extract text deltas for progress
        if (event.type === 'content_block_delta' && event.delta?.text) {
          return {
            type: 'progress',
            content: event.delta.text,
            timestamp: new Date(),
          };
        }

        // Message complete - ignore for now (accumulated text is in progress events)
        if (event.type === 'message_stop') {
          return null;
        }
      }

      // Ignore assistant messages - we already get all text via content_block_delta events
      if (parsed.type === 'assistant') {
        return null;
      }

      // Handle legacy format (backward compatibility)
      if (parsed.type === 'result') {
        return {
          type: 'result',
          content: parsed.result ?? '',
          timestamp: new Date(),
        };
      }

      if (parsed.type === 'error') {
        return {
          type: 'error',
          content: parsed.error ?? parsed.message ?? '',
          timestamp: new Date(),
        };
      }

      // Generic progress for other event types (ensure content is a string)
      if (parsed.content || parsed.message) {
        const rawContent = parsed.content ?? parsed.message;
        const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
        return {
          type: 'progress',
          content,
          timestamp: new Date(),
        };
      }

      return null;
    } catch {
      // Non-JSON line, treat as progress text
      return {
        type: 'progress',
        content: line,
        timestamp: new Date(),
      };
    }
  }
}
