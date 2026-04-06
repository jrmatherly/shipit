/**
 * Codex CLI Executor Service
 *
 * Infrastructure implementation of IAgentExecutor for the OpenAI Codex CLI agent.
 * Executes prompts via the `codex` CLI subprocess with JSONL output format.
 *
 * Uses constructor dependency injection for the spawn function
 * to enable testability without mocking node:child_process directly.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type {
  AgentType,
  AgentFeature,
  AgentConfig,
  CodexPermissionMode,
  LiteLLMProxyConfig,
} from '../../../../../domain/generated/output.js';
import { LiteLLMProxyRoutingMode } from '../../../../../domain/generated/output.js';
import type {
  AgentExecutionOptions,
  AgentExecutionResult,
  AgentExecutionUsage,
  AgentExecutionStreamEvent,
} from '../../../../../application/ports/output/agents/agent-executor.interface.js';
import type { SpawnFunction } from '../types.js';
import { ExecutorBase } from './executor-base.js';

/** Features supported by Codex CLI */
const SUPPORTED_FEATURES = new Set<string>([
  'session-resume',
  'streaming',
  'structured-output',
  'session-listing',
]);

/**
 * Fatal stderr patterns indicating API-level failures even when exit code is 0.
 * Codex CLI may exit 0 after encountering auth or rate-limit errors.
 */
const FATAL_STDERR_PATTERNS = [
  /authentication.*failed/i,
  /rate.?limit/i,
  /quota.*exceeded/i,
  /invalid.*api.?key/i,
  /RESOURCE_EXHAUSTED/i,
];

/**
 * Executor service for OpenAI Codex CLI agent.
 * Uses subprocess spawning to interact with the `codex` CLI.
 */
export class CodexCliExecutorService extends ExecutorBase {
  readonly agentType: AgentType = 'codex-cli' as AgentType;

  private readonly authConfig?: AgentConfig;
  private proxyConfig?: LiteLLMProxyConfig;

  constructor(spawn: SpawnFunction, authConfig?: AgentConfig) {
    super(spawn);
    this.authConfig = authConfig;
  }

  updateProxyConfig(config?: LiteLLMProxyConfig): void {
    this.proxyConfig = config;
  }

  supportsFeature(feature: AgentFeature): boolean {
    return SUPPORTED_FEATURES.has(feature as string);
  }

  async execute(prompt: string, options?: AgentExecutionOptions): Promise<AgentExecutionResult> {
    this.silent = options?.silent ?? false;
    const isResume = !!options?.resumeSession;

    let tempSchemaPath: string | undefined;
    try {
      if (options?.outputSchema) {
        tempSchemaPath = path.join(
          os.tmpdir(),
          `codex-schema-${Date.now()}-${Math.random().toString(36).slice(2)}.json`
        );
        fs.writeFileSync(tempSchemaPath, JSON.stringify(options.outputSchema));
      }

      const args = this.buildArgs(prompt, options, tempSchemaPath);
      const spawnOpts = this.buildSpawnOptions(options);

      this.log(
        `Spawning: codex ${args.map((a) => (a.length > 80 ? `${a.slice(0, 77)}...` : a)).join(' ')}`
      );
      this.log(`Spawn cwd: ${(spawnOpts.cwd as string) ?? '(inherited)'}`);

      const proc = this.spawn('codex', args, spawnOpts);
      this.log(`Subprocess PID: ${proc.pid ?? 'undefined (spawn may have failed)'}`);
      this.log(
        `Prompt length: ${prompt.length} chars${isResume ? ' (positional arg for resume)' : ' (piped via stdin)'}`
      );
      // Log the actual prompt for debugging (truncate very long prompts)
      const promptPreview = prompt.length > 500 ? `${prompt.slice(0, 497)}...` : prompt;
      this.log(`[text] Prompt: ${promptPreview.replace(/\n/g, ' ')}`);

      // For initial executions, pipe the prompt via stdin.
      // For resume, the prompt is already in the CLI args.
      if (!isResume && proc.stdin) {
        proc.stdin.write(prompt);
        proc.stdin.end();
      }

      return await new Promise<AgentExecutionResult>((resolve, reject) => {
        // State accumulated from JSONL events
        let resultText = '';
        let sessionId: string | undefined;
        let usage: AgentExecutionUsage | undefined;

        const timeout = this.createTimeoutHandler(proc, options?.timeout);
        const stderrHandler = this.createStderrHandler();

        const processLine = (line: string) => {
          this.logStreamEvent(line);
          try {
            const parsed = JSON.parse(line);
            const type = parsed.type as string;

            if (type === 'thread.started' && parsed.thread_id) {
              sessionId = parsed.thread_id;
            } else if (
              type === 'item.completed' &&
              CodexCliExecutorService.MESSAGE_ITEM_TYPES.has(parsed.item?.type)
            ) {
              const text = this.extractItemText(parsed);
              if (text) resultText += text;
            } else if (type === 'turn.completed' && parsed.usage) {
              usage = this.extractUsage(parsed.usage);
            }
          } catch {
            // Malformed JSON line — skip gracefully
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
              'Codex CLI ("codex") not found',
              'Please install it: npm i -g @openai/codex'
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
            const message = stderr.trim()
              ? `Process exited with code ${code}: ${stderr.trim()}`
              : `Process exited with code ${code}`;
            reject(new Error(message));
            return;
          }

          // Codex CLI may exit 0 despite fatal API errors.
          const fatalError = this.detectFatalStderrError(stderr);
          if (fatalError) {
            reject(new Error(fatalError));
            return;
          }

          if (!resultText && !sessionId) {
            reject(new Error(`Empty response from Codex CLI. stderr: ${stderr.slice(0, 300)}`));
            return;
          }

          const result: AgentExecutionResult = { result: resultText };
          if (sessionId) result.sessionId = sessionId;
          if (usage) result.usage = usage;
          resolve(result);
        });
      });
    } finally {
      // Clean up temp schema file
      if (tempSchemaPath) {
        try {
          fs.unlinkSync(tempSchemaPath);
        } catch {
          // Best effort cleanup
        }
      }
    }
  }

  async *executeStream(
    prompt: string,
    options?: AgentExecutionOptions
  ): AsyncIterable<AgentExecutionStreamEvent> {
    this.silent = options?.silent ?? false;
    const isResume = !!options?.resumeSession;

    let tempSchemaPath: string | undefined;
    try {
      if (options?.outputSchema) {
        tempSchemaPath = path.join(
          os.tmpdir(),
          `codex-schema-${Date.now()}-${Math.random().toString(36).slice(2)}.json`
        );
        fs.writeFileSync(tempSchemaPath, JSON.stringify(options.outputSchema));
      }

      const args = this.buildArgs(prompt, options, tempSchemaPath);
      const spawnOpts = this.buildSpawnOptions(options);
      const proc = this.spawn('codex', args, spawnOpts);

      // For initial executions, pipe the prompt via stdin.
      // For resume, the prompt is already in the CLI args.
      if (!isResume && proc.stdin) {
        proc.stdin.write(prompt);
        proc.stdin.end();
      }

      const q = this.createStreamQueue();
      const stderrHandler = this.createStderrHandler();
      let timedOut = false;
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      // State accumulated across events
      let resultText = '';
      let spawnError: Error | null = null;

      if (options?.timeout) {
        timeoutId = setTimeout(() => {
          timedOut = true;
          proc.kill();
          q.enqueue({ type: 'error', content: 'Agent execution timed out', timestamp: new Date() });
          q.enqueue(null);
        }, options.timeout);
      }

      const processStreamLine = (line: string) => {
        this.logStreamEvent(line);
        try {
          const parsed = JSON.parse(line);
          const type = parsed.type as string;

          if (type === 'thread.started') {
            // Internal state — no event yielded (thread_id tracked for logging)
            return;
          }

          const isMessage = CodexCliExecutorService.MESSAGE_ITEM_TYPES.has(parsed.item?.type);

          if (type === 'item.started' && isMessage) {
            q.enqueue({ type: 'progress', content: '', timestamp: new Date() });
            return;
          }

          if (type === 'item.updated' && isMessage) {
            const delta = this.extractDeltaText(parsed);
            if (delta) {
              q.enqueue({ type: 'progress', content: delta, timestamp: new Date() });
            }
            return;
          }

          if (type === 'item.completed' && isMessage) {
            const text = this.extractItemText(parsed);
            if (text) resultText += text;
            return;
          }

          if (type === 'item.started' && parsed.item?.type === 'command_execution') {
            const cmd = parsed.item.command ?? parsed.item.name ?? 'command';
            q.enqueue({ type: 'progress', content: `Running: ${cmd}`, timestamp: new Date() });
            return;
          }

          if (type === 'item.completed' && parsed.item?.type === 'command_execution') {
            const exitCode = parsed.item.exit_code ?? '';
            q.enqueue({
              type: 'progress',
              content: `Command completed (exit ${exitCode})`,
              timestamp: new Date(),
            });
            return;
          }

          if (type === 'item.started' && parsed.item?.type === 'file_change') {
            q.enqueue({ type: 'progress', content: 'Modifying files', timestamp: new Date() });
            return;
          }

          if (type === 'item.completed' && parsed.item?.type === 'file_change') {
            const file = parsed.item.file ?? parsed.item.path ?? '';
            q.enqueue({
              type: 'progress',
              content: file ? `Modified: ${file}` : 'File change completed',
              timestamp: new Date(),
            });
            return;
          }

          if (type === 'turn.completed') {
            // Yield final result event
            q.enqueue({
              type: 'result',
              content: resultText,
              timestamp: new Date(),
            });
            return;
          }

          if (type === 'turn.failed') {
            const msg = parsed.error?.message ?? parsed.message ?? 'Turn failed';
            q.enqueue({ type: 'error', content: msg, timestamp: new Date() });
            return;
          }

          if (type === 'error') {
            const msg = parsed.message ?? parsed.error ?? 'Unknown error';
            q.enqueue({ type: 'error', content: msg, timestamp: new Date() });
            return;
          }

          // Unknown event type — skip gracefully
        } catch {
          // Non-JSON line — emit as raw progress
          q.enqueue({ type: 'progress', content: line, timestamp: new Date() });
        }
      };

      const lineBuffer = this.createLineBufferHandler(processStreamLine);

      proc.stdout?.on('data', lineBuffer.handler);
      proc.stderr?.on('data', stderrHandler.handler);

      proc.on('error', (err: Error) => {
        if (timeoutId) clearTimeout(timeoutId);
        spawnError = err;
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
          // Check for fatal stderr patterns on exit 0
          const fatalError = this.detectFatalStderrError(stderr);
          if (fatalError) {
            q.enqueue({ type: 'error', content: fatalError, timestamp: new Date() });
          }
        }
        q.enqueue(null);
      });

      // Yield events as they arrive
      while (true) {
        await q.waitForItem();
        const item = q.shift();
        if (item === null || item === undefined) {
          if (spawnError !== null) {
            yield {
              type: 'error' as const,
              content: (spawnError as Error).message,
              timestamp: new Date(),
            };
          }
          return;
        }
        yield item;
      }
    } finally {
      // Clean up temp schema file
      if (tempSchemaPath) {
        try {
          fs.unlinkSync(tempSchemaPath);
        } catch {
          // Best effort cleanup
        }
      }
    }
  }

  /**
   * Log a JSONL stream line as a human-readable event in the worker log.
   * Extracts tool calls (function_call), assistant text, command executions,
   * and result summaries for verbose debugging.
   */
  /** Item types that represent assistant text messages */
  private static readonly MESSAGE_ITEM_TYPES = new Set(['agent_message', 'message']);

  private logStreamEvent(line: string): void {
    try {
      const parsed = JSON.parse(line);
      const type = parsed.type as string;
      const itemType = parsed.item?.type as string | undefined;

      // Thread lifecycle
      if (type === 'thread.started') {
        this.log(`[thread] started thread_id=${parsed.thread_id ?? 'unknown'}`);
        return;
      }

      // Agent/assistant message text — log the content
      if (
        type === 'item.completed' &&
        itemType &&
        CodexCliExecutorService.MESSAGE_ITEM_TYPES.has(itemType)
      ) {
        const text = this.extractItemText(parsed);
        if (text) {
          const preview = text.length > 200 ? `${text.slice(0, 197)}...` : text;
          this.log(`[text] ${preview.replace(/\n/g, ' ')}`);
        }
        return;
      }

      // Delta/partial updates for messages — log text fragments
      if (
        type === 'item.updated' &&
        itemType &&
        CodexCliExecutorService.MESSAGE_ITEM_TYPES.has(itemType)
      ) {
        const delta = this.extractDeltaText(parsed);
        if (delta) {
          this.log(`[delta] ${delta.replace(/\n/g, ' ')}`);
        }
        return;
      }

      // Reasoning items — model's chain-of-thought
      if (type === 'item.completed' && itemType === 'reasoning') {
        const text = this.extractItemText(parsed);
        if (text) {
          const preview = text.length > 200 ? `${text.slice(0, 197)}...` : text;
          this.log(`[text] Reasoning: ${preview.replace(/\n/g, ' ')}`);
        }
        return;
      }

      // Function/tool calls — log name and arguments
      if (type === 'item.started' && itemType === 'function_call') {
        const name = parsed.item.name ?? parsed.item.call_id ?? 'unknown';
        const args = parsed.item.arguments ?? '';
        this.log(`[tool] ${name} ${typeof args === 'string' ? args : JSON.stringify(args)}`);
        return;
      }
      if (type === 'item.completed' && itemType === 'function_call') {
        const name = parsed.item.name ?? 'unknown';
        this.log(`[tool] ${name} completed`);
        return;
      }

      // Function call output — log truncated result
      if (type === 'item.completed' && itemType === 'function_call_output') {
        const output = parsed.item.output ?? '';
        const preview =
          typeof output === 'string'
            ? output.length > 200
              ? `${output.slice(0, 197)}...`
              : output
            : JSON.stringify(output).slice(0, 200);
        this.log(`[tool-result] ${preview.replace(/\n/g, ' ')}`);
        return;
      }

      // Command executions (Codex shell tool)
      if (type === 'item.started' && itemType === 'command_execution') {
        const cmd = parsed.item.command ?? parsed.item.name ?? 'command';
        this.log(`[cmd] running: ${cmd}`);
        return;
      }
      if (type === 'item.completed' && itemType === 'command_execution') {
        const exitCode = parsed.item.exit_code ?? '';
        const output = parsed.item.output ?? '';
        const preview =
          typeof output === 'string'
            ? output.length > 200
              ? `${output.slice(0, 197)}...`
              : output
            : '';
        this.log(
          `[cmd] exit=${exitCode}${preview ? ` output: ${preview.replace(/\n/g, ' ')}` : ''}`
        );
        return;
      }

      // File changes
      if (type === 'item.started' && itemType === 'file_change') {
        const file = parsed.item.file ?? parsed.item.path ?? '';
        this.log(`[file] modifying: ${file}`);
        return;
      }
      if (type === 'item.completed' && itemType === 'file_change') {
        const file = parsed.item.file ?? parsed.item.path ?? '';
        this.log(`[file] modified: ${file}`);
        return;
      }

      // Turn lifecycle with usage stats
      if (type === 'turn.completed') {
        const u = parsed.usage;
        if (u) {
          const inTokens = u.input_tokens ?? 0;
          const outTokens = u.output_tokens ?? 0;
          this.log(`[tokens] ${inTokens} in / ${outTokens} out`);
        } else {
          this.log('[turn] completed');
        }
        return;
      }

      if (type === 'turn.failed') {
        const msg = parsed.error?.message ?? parsed.message ?? 'unknown';
        this.log(`[turn] FAILED: ${msg}`);
        return;
      }

      // Error events
      if (type === 'error') {
        const msg = parsed.message ?? parsed.error ?? 'unknown';
        this.log(`[error] ${msg}`);
        return;
      }

      // Catch-all: log any unhandled event so nothing is silently dropped
      const summary = itemType ? `${type} (${itemType})` : type;
      const snippet = line.length > 200 ? `${line.slice(0, 197)}...` : line;
      this.log(`[event] ${summary}: ${snippet}`);
    } catch {
      // Non-JSON line — log raw
      if (line.length > 0) {
        this.log(`[raw] ${line}`);
      }
    }
  }

  /**
   * Build CLI arguments for codex exec.
   *
   * For initial execution: `codex exec - --json --sandbox danger-full-access ...`
   * For resume: `codex exec resume <threadId> "prompt" --json --sandbox danger-full-access ...`
   */
  private buildArgs(
    prompt: string,
    options?: AgentExecutionOptions,
    tempSchemaPath?: string
  ): string[] {
    const sandbox = (options?.permissionMode as CodexPermissionMode) ?? 'danger-full-access';
    const baseFlags = [
      '--json',
      '--sandbox',
      sandbox,
      '--ask-for-approval',
      'never', // BUG FIX: was implicit/missing — required for non-interactive batch runs
      '--skip-git-repo-check',
      '--color',
      'never',
    ];

    if (options?.model) baseFlags.push('--model', options.model);
    if (options?.cwd) baseFlags.push('--cd', options.cwd);
    if (tempSchemaPath) baseFlags.push('--output-schema', tempSchemaPath);

    if (options?.resumeSession) {
      // Resume mode: codex exec resume <threadId> "prompt" [flags]
      return ['exec', 'resume', options.resumeSession, prompt, ...baseFlags];
    }

    // Initial execution: codex exec - [flags]
    // The `-` indicates prompt is piped via stdin
    return ['exec', '-', ...baseFlags];
  }

  protected override buildSpawnEnv(): Record<string, string | undefined> {
    const env = super.buildSpawnEnv();

    // Proxy mode: use OPENAI_BASE_URL + OPENAI_API_KEY (not CODEX_API_KEY)
    const cx = this.proxyConfig?.codexCli;
    if (cx?.routingMode === LiteLLMProxyRoutingMode.proxy && this.proxyConfig?.baseUrl) {
      env.OPENAI_BASE_URL = this.proxyConfig.baseUrl;
      if (this.proxyConfig.apiKey) {
        env.OPENAI_API_KEY = this.proxyConfig.apiKey;
      }
      return env;
    }

    // Direct mode: existing authConfig token injection
    if (this.authConfig?.authMethod === 'token' && this.authConfig.token) {
      env.CODEX_API_KEY = this.authConfig.token;
    }
    return env;
  }

  /**
   * Extract token usage from Codex CLI turn.completed usage object.
   */
  private extractUsage(usageObj: Record<string, number>): AgentExecutionUsage | undefined {
    if (usageObj.input_tokens === undefined && usageObj.output_tokens === undefined) {
      return undefined;
    }
    return {
      inputTokens: usageObj.input_tokens ?? 0,
      outputTokens: usageObj.output_tokens ?? 0,
    };
  }

  /**
   * Extract delta text from an item.updated event.
   * Codex CLI uses `item.text` directly, while other formats use content blocks or `item.delta`.
   */
  private extractDeltaText(parsed: Record<string, unknown>): string | undefined {
    const item = parsed.item as Record<string, unknown> | undefined;
    if (!item) return undefined;
    // Codex CLI format: item.text is a plain string (accumulated so far)
    if (typeof item.text === 'string' && item.text) return item.text;
    // Fallback: content block array
    const content = item.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === 'text' && block.text) return block.text;
      }
    }
    if (typeof item.delta === 'string') return item.delta;
    return undefined;
  }

  /**
   * Extract final text from an item.completed event.
   * Codex CLI uses `item.text` directly, while other formats use `item.content` blocks.
   */
  private extractItemText(parsed: Record<string, unknown>): string | undefined {
    const item = parsed.item as Record<string, unknown> | undefined;
    if (!item) return undefined;
    // Codex CLI format: item.text is a plain string
    if (typeof item.text === 'string' && item.text) return item.text;
    // Fallback: content block array format
    const content = item.content;
    if (Array.isArray(content)) {
      const parts: string[] = [];
      for (const block of content) {
        if (block.type === 'text' && block.text) parts.push(block.text);
      }
      return parts.length > 0 ? parts.join('') : undefined;
    }
    if (typeof content === 'string') return content;
    return undefined;
  }

  /**
   * Check stderr for patterns indicating fatal API errors.
   * Returns an error message if fatal patterns are found, null otherwise.
   */
  private detectFatalStderrError(stderr: string): string | null {
    for (const pattern of FATAL_STDERR_PATTERNS) {
      if (pattern.test(stderr)) {
        const lines = stderr.split('\n').filter((l) => l.trim());
        const summary = lines.slice(0, 3).join(' | ').slice(0, 300);
        return `Codex CLI exited 0 but fatal error detected in stderr: ${summary}`;
      }
    }
    return null;
  }
}
