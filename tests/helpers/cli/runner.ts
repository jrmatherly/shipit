/**
 * CLI Test Runner
 *
 * Utility for executing CLI commands in E2E tests.
 * Provides consistent interface for running commands and capturing output.
 *
 * ISOLATION: Each runner uses a unique SHIPIT_AI_HOME temp directory by default,
 * ensuring parallel test files never share database state.
 *
 * NOTE: Uses execSync intentionally for test simplicity. All inputs are
 * controlled by test code, not user input, so command injection is not a risk.
 *
 * @example
 * import { runCli, createCliRunner } from '@tests/helpers/cli/runner';
 *
 * // Simple usage (auto-isolated)
 * const result = runCli('version');
 *
 * // With custom options
 * const runner = createCliRunner({ cwd: '/custom/path' });
 * const result = runner.run('version');
 *
 * // Lifecycle-managed isolation (recommended for settings tests)
 * const { runner, cleanup } = createIsolatedCliRunner();
 * const result = runner.run('settings show');
 * cleanup(); // removes temp dir
 */

import {
  execFileSync,
  execFile,
  type ExecFileSyncOptionsWithStringEncoding,
} from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// execFile is used instead of exec so that arguments are passed as an argv
// array rather than concatenated into a shell command string. This avoids
// shell-injection risk (tests only, but still follows CLAUDE.md's ban on
// shell:true spawning) and keeps CodeQL's js/shell-command-injection-from-
// environment analysis satisfied.
const execFileAsync = promisify(execFile);

/**
 * Result of a CLI command execution
 */
export interface CliResult {
  /** Standard output */
  stdout: string;
  /** Standard error (empty for successful commands) */
  stderr: string;
  /** Exit code (0 = success) */
  exitCode: number;
  /** Whether the command succeeded */
  success: boolean;
}

/**
 * Options for CLI runner
 */
export interface CliRunnerOptions {
  /** Working directory for command execution */
  cwd?: string;
  /** Environment variables to set */
  env?: Record<string, string>;
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * CLI Runner instance
 */
export interface CliRunner {
  /**
   * Run a CLI command
   * @param args - Command arguments (e.g., 'version', '--help')
   * @returns Command result with stdout, stderr, exitCode
   */
  run: (args: string) => CliResult;

  /**
   * Run a CLI command and expect it to succeed
   * @param args - Command arguments
   * @throws Error if command fails
   */
  runOrThrow: (args: string) => CliResult;
}

/**
 * Isolated CLI Runner with lifecycle management
 */
export interface IsolatedCliRunner {
  /** The CLI runner instance */
  runner: CliRunner;
  /** Path to the isolated SHIPIT_AI_HOME directory */
  shipitAiHome: string;
  /** Cleanup function to remove the temp directory */
  cleanup: () => void;
}

/** Project root directory */
const PROJECT_ROOT = resolve(__dirname, '../../..');

/** Path to CLI entry point (TypeScript via tsx) */
const CLI_PATH_DEV = resolve(PROJECT_ROOT, 'src/presentation/cli/index.ts');

/** Path to CLI entry point (compiled JS) */
const CLI_PATH_DIST = resolve(PROJECT_ROOT, 'dist/src/presentation/cli/index.js');

/**
 * Whether to use compiled dist/ by default (set via SHIPIT_AI_E2E_USE_DIST=1).
 * Running against dist/ is ~3.5x faster per spawn since it skips tsx compilation.
 */
const USE_DIST_BY_DEFAULT = !!process.env.SHIPIT_AI_E2E_USE_DIST;

/**
 * Default runner options
 */
const DEFAULT_OPTIONS: Required<CliRunnerOptions> = {
  cwd: PROJECT_ROOT,
  env: {
    // Use deterministic mock executor for E2E tests (no real AI calls)
    SHIPIT_AI_MOCK_EXECUTOR: '1',
  },
  timeout: process.platform === 'win32' ? 30000 : 15000,
};

/** Creates a unique temp directory for SHIPIT_AI_HOME isolation */
function createTempShipitAiHome(): string {
  return mkdtempSync(join(tmpdir(), 'shipit-ai-e2e-'));
}

/**
 * Module-level temp dir for auto-isolation.
 * Shared across all runCli() calls in the same test file (vitest worker).
 * Each test file runs in its own worker, so this provides file-level isolation.
 */
let moduleShipitAiHome: string | null = null;

function getModuleShipitAiHome(): string {
  moduleShipitAiHome ??= createTempShipitAiHome();
  return moduleShipitAiHome;
}

/**
 * Split a test-friendly args string into an argv array for execFile-style
 * spawn. Supports the minimal shell-like quoting the existing test suite
 * relies on:
 *
 *   - Whitespace separates argv elements.
 *   - Double- or single-quoted groups become a single argv element with
 *     the surrounding quotes stripped. Quotes are not re-interpreted after
 *     stripping (no nested quoting, no backslash escapes, no $var expansion).
 *   - Mixed tokens like `--name="Add feature"` are supported.
 *
 * This is NOT a full shell tokenizer — it only covers what existing tests
 * need. If you want richer semantics, pass the argv directly via
 * `createCliRunner` and call `execFile` yourself. The parser exists only
 * so legacy tests that built up command strings (e.g.
 * `` `feat new "Add user authentication" --repo ${tempRepo}` ``) keep
 * working after the switch from execSync to execFileSync.
 */
// Exported for unit testing. Not part of the public test-runner API.
export function parseArgs(args: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quoteChar: "'" | '"' | null = null;
  let hasContent = false;

  for (const ch of args) {
    if (quoteChar) {
      if (ch === quoteChar) {
        quoteChar = null;
        // Keep accumulating — the closing quote itself is discarded but
        // any trailing non-whitespace chars (e.g. in --name="foo"bar)
        // continue the current token.
      } else {
        current += ch;
        hasContent = true;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quoteChar = ch;
      hasContent = true; // empty quoted string `""` is still a token
      continue;
    }
    if (/\s/.test(ch)) {
      if (hasContent) {
        tokens.push(current);
        current = '';
        hasContent = false;
      }
      continue;
    }
    current += ch;
    hasContent = true;
  }

  if (quoteChar) {
    throw new Error(`parseArgs: unterminated ${quoteChar} in args: ${args}`);
  }
  if (hasContent) tokens.push(current);
  return tokens;
}

/**
 * Resolve the runner binary name for the current platform. On Windows,
 * `npx` ships as `npx.cmd` and Node's execFile does NOT auto-resolve the
 * `.cmd` extension without `shell: true` (which would reintroduce the
 * injection surface we removed). Passing the explicit `.cmd` name lets
 * Node find the shim via the standard PATHEXT lookup.
 *
 * `node` is always a native binary (`node.exe` on Windows) and is resolved
 * without any special handling.
 */
function resolveRunnerBinary(useDist: boolean): string {
  if (useDist) return 'node';
  return process.platform === 'win32' ? 'npx.cmd' : 'npx';
}

/**
 * Execute CLI command and capture result.
 *
 * Uses execFileSync with an argv array rather than execSync with a joined
 * shell command string so that: (1) no shell is spawned (matches the
 * cross-platform rule banning shell:true), (2) arguments cannot be
 * reinterpreted as shell syntax, and (3) CodeQL's
 * js/shell-command-injection-from-environment analysis sees a sanitized
 * flow (argv form is a recognized sanitizer).
 */
function executeCommand(
  args: string,
  options: Required<CliRunnerOptions>,
  useDist = USE_DIST_BY_DEFAULT
): CliResult {
  const cliPath = useDist ? CLI_PATH_DIST : CLI_PATH_DEV;
  const runner = resolveRunnerBinary(useDist);
  const runnerArgs = useDist ? [cliPath, ...parseArgs(args)] : ['tsx', cliPath, ...parseArgs(args)];

  const execOptions: ExecFileSyncOptionsWithStringEncoding = {
    cwd: options.cwd,
    encoding: 'utf-8',
    timeout: options.timeout,
    env: {
      ...process.env,
      ...options.env,
      // Force no color for consistent test output
      NO_COLOR: '1',
      FORCE_COLOR: '0',
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  };

  try {
    const stdout = execFileSync(runner, runnerArgs, execOptions);
    return {
      stdout: stdout.trim(),
      stderr: '',
      exitCode: 0,
      success: true,
    };
  } catch (error) {
    const execError = error as {
      stdout?: Buffer | string;
      stderr?: Buffer | string;
      status?: number;
    };

    return {
      stdout: String(execError.stdout ?? '').trim(),
      stderr: String(execError.stderr ?? '').trim(),
      exitCode: execError.status ?? 1,
      success: false,
    };
  }
}

/**
 * Create a CLI runner with custom options.
 * Automatically sets SHIPIT_AI_HOME to a temp directory unless explicitly provided.
 *
 * @param options - Runner configuration
 * @param useDist - Use compiled dist instead of tsx (for production testing)
 * @returns CLI runner instance
 */
export function createCliRunner(
  options: CliRunnerOptions = {},
  useDist = USE_DIST_BY_DEFAULT
): CliRunner {
  // Auto-isolate: set SHIPIT_AI_HOME to a module-level temp dir unless caller provides one or HOME override.
  // Uses a shared dir per test file (vitest worker) so the database is initialized once per file.
  const needsIsolation = !options.env?.SHIPIT_AI_HOME && !options.env?.HOME;
  const isolationEnv: Record<string, string> = needsIsolation
    ? { SHIPIT_AI_HOME: getModuleShipitAiHome() }
    : {};

  const mergedOptions: Required<CliRunnerOptions> = {
    ...DEFAULT_OPTIONS,
    ...options,
    env: { ...DEFAULT_OPTIONS.env, ...isolationEnv, ...options.env },
  };

  return {
    run: (args: string) => executeCommand(args, mergedOptions, useDist),

    runOrThrow: (args: string) => {
      const result = executeCommand(args, mergedOptions, useDist);
      if (!result.success) {
        throw new Error(
          `CLI command failed with exit code ${result.exitCode}:\n` +
            `Command: shipit-ai ${args}\n` +
            `Stdout: ${result.stdout}\n` +
            `Stderr: ${result.stderr}`
        );
      }
      return result;
    },
  };
}

/**
 * Create an isolated CLI runner with explicit lifecycle management.
 * Use this when tests need a shared isolated state across multiple commands
 * (e.g., configure agent then verify settings).
 *
 * @param options - Runner configuration
 * @returns Runner, shipitAiHome path, and cleanup function
 *
 * @example
 * const { runner, cleanup } = createIsolatedCliRunner();
 * try {
 *   runner.run('settings agent --agent claude-code --auth session');
 *   const result = runner.run('settings show --output json');
 * } finally {
 *   cleanup();
 * }
 */
export function createIsolatedCliRunner(options: CliRunnerOptions = {}): IsolatedCliRunner {
  const shipitAiHome = createTempShipitAiHome();
  const runner = createCliRunner({
    ...options,
    env: { ...options.env, SHIPIT_AI_HOME: shipitAiHome },
  });

  return {
    runner,
    shipitAiHome,
    cleanup: () => {
      try {
        rmSync(shipitAiHome, { recursive: true, force: true });
      } catch {
        // best-effort cleanup
      }
    },
  };
}

/**
 * Run a CLI command with default options (auto-isolated)
 *
 * NOTE: Each call creates a new temp SHIPIT_AI_HOME. For tests that need
 * state to persist between commands, use createIsolatedCliRunner() instead.
 *
 * @param args - Command arguments
 * @returns Command result
 */
export function runCli(args: string): CliResult {
  const runner = createCliRunner();
  return runner.run(args);
}

/**
 * Run a CLI command asynchronously (non-blocking, auto-isolated)
 *
 * Uses execFile with an argv array for the same reasons as executeCommand()
 * above: no shell, no injection risk, satisfies CodeQL's shell-command-
 * injection analysis.
 */
export async function runCliAsync(args: string): Promise<CliResult> {
  const shipitAiHome = getModuleShipitAiHome();
  const cliPath = USE_DIST_BY_DEFAULT ? CLI_PATH_DIST : CLI_PATH_DEV;
  const runner = resolveRunnerBinary(USE_DIST_BY_DEFAULT);
  const runnerArgs = USE_DIST_BY_DEFAULT
    ? [cliPath, ...parseArgs(args)]
    : ['tsx', cliPath, ...parseArgs(args)];

  const execOptions = {
    cwd: DEFAULT_OPTIONS.cwd,
    encoding: 'utf-8' as const,
    timeout: DEFAULT_OPTIONS.timeout,
    env: {
      ...process.env,
      ...DEFAULT_OPTIONS.env,
      SHIPIT_AI_HOME: shipitAiHome,
      NO_COLOR: '1',
      FORCE_COLOR: '0',
    },
  };

  try {
    const { stdout, stderr } = await execFileAsync(runner, runnerArgs, execOptions);
    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: 0,
      success: true,
    };
  } catch (error) {
    const execError = error as {
      stdout?: string;
      stderr?: string;
      code?: number;
    };
    return {
      stdout: String(execError.stdout ?? '').trim(),
      stderr: String(execError.stderr ?? '').trim(),
      exitCode: execError.code ?? 1,
      success: false,
    };
  }
}

/**
 * Run a CLI command and throw if it fails (auto-isolated)
 */
export function runCliOrThrow(args: string): CliResult {
  const runner = createCliRunner();
  return runner.runOrThrow(args);
}
