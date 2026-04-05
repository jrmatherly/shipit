'use server';

import { realpathSync } from 'node:fs';
import { platform } from 'node:os';
import { isAbsolute } from 'node:path';
import { spawn } from 'node:child_process';
import { computeWorktreePath } from '@/lib/core-utils';
import { resolve } from '@/lib/server-container';
import type { LoadSettingsUseCase } from '@shipit-ai/core/application/use-cases/settings/load-settings.use-case';
import type { IToolInstallerService } from '@shipit-ai/core/application/ports/output/services/tool-installer.service';

/**
 * Resolve the target path through realpath() so that any symlink traversal
 * happens up-front and the resulting absolute path is the authoritative
 * value used for all subsequent spawn operations. Returns null if the path
 * does not exist or cannot be resolved.
 */
function resolveTargetPath(repositoryPath: string, branch?: string): string | null {
  try {
    const base = branch ? computeWorktreePath(repositoryPath, branch) : repositoryPath;
    return realpathSync(base);
  } catch {
    return null;
  }
}

/**
 * POSIX shell-escape a path for safe inclusion in a shell:true command string.
 * Wraps in single quotes and escapes embedded single quotes using the
 * standard '\'' pattern. All tool configurations that opt into shell:true
 * use POSIX-style commands (`cd {dir} && exec <tool>`) and run on Unix only.
 */
function shellEscapePosixPath(p: string): string {
  return `'${p.replace(/'/g, `'\\''`)}'`;
}

// Fallback commands for the "system" terminal when no tool metadata entry exists.
// Uses a record lookup instead of if/else to prevent the bundler from
// tree-shaking platform branches at build time. Turbopack evaluates
// os.platform() during the build and dead-code-eliminates unused branches,
// baking in the CI platform (linux) and breaking macOS/Windows installs.
const SYSTEM_TERMINAL_COMMANDS: Record<string, { cmd: string; args: (path: string) => string[] }> =
  {
    darwin: { cmd: 'open', args: (p) => ['-a', 'Terminal', p] },
    linux: { cmd: 'x-terminal-emulator', args: (p) => [`--working-directory=${p}`] },
    win32: {
      cmd: 'cmd.exe',
      args: (p) => ['/c', 'start', 'powershell', '-NoExit', '-Command', `Set-Location "${p}"`],
    },
  };

interface OpenShellInput {
  repositoryPath: string;
  branch?: string;
}

export async function openShell(
  input: OpenShellInput
): Promise<{ success: boolean; error?: string; path?: string; shell?: string }> {
  const { repositoryPath, branch } = input;

  if (!repositoryPath || !isAbsolute(repositoryPath)) {
    return { success: false, error: 'repositoryPath must be an absolute path' };
  }

  try {
    const loadSettings = resolve<LoadSettingsUseCase>('LoadSettingsUseCase');
    const settings = await loadSettings.execute();
    const shell = settings.environment.shellPreference;
    const terminalPref = settings.environment.terminalPreference ?? 'system';

    // Resolve the target path through realpath() up-front. From this point
    // on, `targetPath` is the authoritative, symlink-resolved absolute path
    // used for every spawn call — never the raw user-supplied value.
    const targetPath = resolveTargetPath(repositoryPath, branch);
    if (!targetPath) {
      return { success: false, error: 'Path does not exist' };
    }

    // Try to find the terminal in tool metadata via DI container.
    // Using DI (not a direct import from tool-metadata) ensures that
    // TOOL_METADATA is read from the correct tools/ directory path — it is loaded once
    // in the Node.js CLI bootstrap context where import.meta.url resolves correctly.
    // Direct imports of tool-metadata break in standalone production builds.
    if (terminalPref !== 'system') {
      try {
        const service = resolve<IToolInstallerService>('IToolInstallerService');
        const config = service.getTerminalOpenConfig(terminalPref);

        if (config?.openDirectory.includes('{dir}')) {
          if (config.shell) {
            // For shell:true tools (claude-code, codex-cli, etc.) the tool
            // config is a POSIX shell string like `cd {dir} && exec claude`.
            // Shell-escape the path to prevent command injection: a malicious
            // path like `/tmp; rm -rf /` becomes `'/tmp; rm -rf /'` which the
            // shell treats as a single literal argument to `cd`.
            const escapedPath = shellEscapePosixPath(targetPath);
            const command = config.openDirectory.replaceAll('{dir}', escapedPath);
            // SECURITY: targetPath from realpathSync (must exist on disk); single-quote
            // shell-escaped via shellEscapePosixPath; localhost-only server action.
            // shell:true is required by tool configs using `cd {dir} && exec <tool>`.
            // CodeQL flags this because it does not model custom sanitizer functions —
            // alert js/command-line-injection #29 dismissed as false positive.
            const child = spawn(command, [], {
              detached: true,
              stdio: 'ignore',
              shell: true,
            });
            child.on('error', () => undefined);
            child.unref();
          } else {
            // For non-shell tools (alacritty, kitty, etc.) the config is a
            // whitespace-separated command. Split first, then substitute {dir}
            // INTO AN ARGV ELEMENT (never back into a concatenated string).
            // CodeQL recognizes the argv-form of spawn as sanitized input.
            const tokens = config.openDirectory.split(/\s+/).filter(Boolean);
            const command = tokens[0];
            const args = tokens.slice(1).map((t) => t.replaceAll('{dir}', targetPath));
            const child = spawn(command, args, {
              detached: true,
              stdio: 'ignore',
            });
            child.on('error', () => undefined);
            child.unref();
          }

          return { success: true, path: targetPath, shell };
        }
      } catch {
        // DI container not available — fall through to system terminal
      }
    }

    // Fallback to system terminal
    const entry = SYSTEM_TERMINAL_COMMANDS[platform()];
    if (!entry) {
      return {
        success: false,
        error: `Unsupported platform: ${platform()}`,
      };
    }

    const child = spawn(entry.cmd, entry.args(targetPath), {
      detached: true,
      stdio: 'ignore',
    });
    child.on('error', () => undefined); // Prevent uncaught exception on spawn failure
    child.unref();

    return { success: true, path: targetPath, shell };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to open shell';
    return { success: false, error: message };
  }
}
