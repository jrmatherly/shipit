/**
 * Environment Detector Service Implementation
 *
 * Probes environment variables and system binaries to detect the user's
 * default editor, shell, and terminal emulator. Used during onboarding
 * to pre-populate settings with sensible defaults.
 */

import { injectable, inject } from 'tsyringe';
import { platform } from 'node:os';
import path from 'node:path';

import { EditorType, TerminalType } from '../../domain/generated/output.js';
import type {
  IEnvironmentDetectorService,
  DetectedEnvironment,
  AvailableEditorEntry,
  AvailableShellEntry,
} from '../../application/ports/output/services/environment-detector.service.js';
import type { IToolInstallerService } from '../../application/ports/output/services/tool-installer.service.js';
import { checkBinaryExists } from './tool-installer/binary-exists.js';

/**
 * Maps editor binary basenames to EditorType enum values.
 */
const EDITOR_BINARY_MAP: Record<string, EditorType> = {
  code: EditorType.VsCode,
  cursor: EditorType.Cursor,
  windsurf: EditorType.Windsurf,
  zed: EditorType.Zed,
  antigravity: EditorType.Antigravity,
  agy: EditorType.Antigravity,
};

/**
 * Maps TERM_PROGRAM environment variable values to TerminalType enum values.
 */
const TERM_PROGRAM_MAP: Record<string, TerminalType> = {
  WarpTerminal: TerminalType.Warp,
  'iTerm.app': TerminalType.ITerm2,
  Apple_Terminal: TerminalType.System,
};

/**
 * Fallback mapping from $TERM to TerminalType when TERM_PROGRAM is not set.
 */
const TERM_FALLBACK_MAP: Record<string, TerminalType> = {
  alacritty: TerminalType.Alacritty,
  'xterm-kitty': TerminalType.Kitty,
};

/**
 * Maps shell basenames to canonical shell identifier strings.
 */
const SHELL_BASENAME_MAP: Record<string, string> = {
  bash: 'bash',
  zsh: 'zsh',
  fish: 'fish',
  sh: 'bash',
  pwsh: 'powershell',
  powershell: 'powershell',
};

/**
 * Editor entries mapping tool metadata IDs to EditorType and display names.
 */
const EDITOR_ENTRIES: readonly {
  toolId: string;
  editorType: EditorType;
  name: string;
}[] = [
  { toolId: 'vscode', editorType: EditorType.VsCode, name: 'VS Code' },
  { toolId: 'cursor', editorType: EditorType.Cursor, name: 'Cursor' },
  { toolId: 'windsurf', editorType: EditorType.Windsurf, name: 'Windsurf' },
  { toolId: 'zed', editorType: EditorType.Zed, name: 'Zed' },
  { toolId: 'antigravity', editorType: EditorType.Antigravity, name: 'Antigravity' },
];

/**
 * Shell entries with display names and platform constraints.
 */
const SHELL_ENTRIES: readonly {
  id: string;
  name: string;
  /** Platforms where this shell is available. Null means all platforms. */
  platforms: NodeJS.Platform[] | null;
}[] = [
  { id: 'bash', name: 'Bash', platforms: null },
  { id: 'zsh', name: 'Zsh', platforms: ['darwin', 'linux'] },
  { id: 'fish', name: 'Fish', platforms: ['darwin', 'linux'] },
  { id: 'powershell', name: 'PowerShell', platforms: null },
];

@injectable()
export class EnvironmentDetectorServiceImpl implements IEnvironmentDetectorService {
  constructor(
    @inject('IToolInstallerService')
    private readonly toolInstallerService: IToolInstallerService
  ) {}

  /**
   * Detect default editor, shell, and terminal from environment variables.
   */
  detectDefaults(): DetectedEnvironment {
    return {
      defaultEditor: this.detectEditor(),
      defaultShell: this.detectShell(),
      defaultTerminal: this.detectTerminal(),
    };
  }

  /**
   * List all known editors with their availability on the current system.
   */
  async listAvailableEditors(): Promise<AvailableEditorEntry[]> {
    const results: AvailableEditorEntry[] = [];

    for (const entry of EDITOR_ENTRIES) {
      const status = await this.toolInstallerService.checkAvailability(entry.toolId);
      results.push({
        id: entry.editorType,
        name: entry.name,
        available: status.status === 'available',
      });
    }

    return results;
  }

  /**
   * List all known shells with their availability on the current system.
   */
  async listAvailableShells(): Promise<AvailableShellEntry[]> {
    const currentPlatform = platform();
    const results: AvailableShellEntry[] = [];

    for (const entry of SHELL_ENTRIES) {
      // Skip shells not available on this platform
      if (entry.platforms && !entry.platforms.includes(currentPlatform)) {
        continue;
      }

      let available = false;

      if (entry.id === 'powershell') {
        // Check pwsh first (cross-platform PowerShell), then powershell (Windows-only)
        const pwshResult = await checkBinaryExists('pwsh');
        if (pwshResult.found) {
          available = true;
        } else {
          const powershellResult = await checkBinaryExists('powershell');
          available = powershellResult.found;
        }
      } else {
        const result = await checkBinaryExists(entry.id);
        available = result.found;
      }

      results.push({
        id: entry.id,
        name: entry.name,
        available,
      });
    }

    return results;
  }

  /**
   * Detect the default editor from $VISUAL or $EDITOR environment variables.
   */
  private detectEditor(): EditorType | null {
    const editorEnv = process.env.VISUAL ?? process.env.EDITOR;
    if (!editorEnv) {
      return null;
    }

    const basename = path.basename(editorEnv);
    return EDITOR_BINARY_MAP[basename] ?? null;
  }

  /**
   * Detect the default shell from $SHELL or Windows environment.
   */
  private detectShell(): string | null {
    const shellEnv = process.env.SHELL;

    if (shellEnv) {
      const basename = path.basename(shellEnv);
      return SHELL_BASENAME_MAP[basename] ?? basename;
    }

    // Windows fallback: no $SHELL env var
    if (platform() === 'win32') {
      if (process.env.PSModulePath) {
        return 'powershell';
      }
      return 'bash';
    }

    return null;
  }

  /**
   * Detect the default terminal from $TERM_PROGRAM or $TERM.
   */
  private detectTerminal(): TerminalType | null {
    const termProgram = process.env.TERM_PROGRAM;
    if (termProgram) {
      return TERM_PROGRAM_MAP[termProgram] ?? null;
    }

    // Fallback to $TERM for terminals that only set this
    const term = process.env.TERM;
    if (term) {
      return TERM_FALLBACK_MAP[term] ?? null;
    }

    return null;
  }
}
