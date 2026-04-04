// @vitest-environment node
/**
 * Unit tests for EnvironmentDetectorServiceImpl
 *
 * Tests synchronous environment detection (detectDefaults) and async
 * availability listing (listAvailableEditors, listAvailableShells).
 */

import 'reflect-metadata';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

const mockCheckBinaryExists = vi.hoisted(() => vi.fn());
const mockPlatform = vi.hoisted(() => vi.fn(() => 'darwin'));

// Mock binary-exists module before importing the service
vi.mock('@/infrastructure/services/tool-installer/binary-exists', () => ({
  checkBinaryExists: mockCheckBinaryExists,
}));

// Mock node:os to control platform() return value
vi.mock('node:os', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, platform: mockPlatform };
});

import { EditorType, TerminalType } from '@/domain/generated/output';
import { EnvironmentDetectorServiceImpl } from '@/infrastructure/services/environment-detector.service';
import {
  createAvailableStatus,
  createMissingStatus,
} from '@/domain/value-objects/tool-installation-status';
import type { IToolInstallerService } from '@/application/ports/output/services/tool-installer.service';

/**
 * Creates a mock IToolInstallerService for constructor injection.
 */
function createMockToolInstallerService(): IToolInstallerService {
  return {
    checkAvailability: vi.fn(),
    getInstallCommand: vi.fn(),
    executeInstall: vi.fn(),
    listAvailableTerminals: vi.fn(),
    getTerminalOpenConfig: vi.fn(),
  };
}

describe('EnvironmentDetectorServiceImpl', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let mockToolInstallerService: IToolInstallerService;
  let service: EnvironmentDetectorServiceImpl;

  beforeEach(() => {
    originalEnv = { ...process.env };

    // Clear all env vars relevant to detection
    delete process.env.VISUAL;
    delete process.env.EDITOR;
    delete process.env.SHELL;
    delete process.env.TERM_PROGRAM;
    delete process.env.TERM;
    delete process.env.PSModulePath;

    // Reset hoisted mocks between tests
    mockCheckBinaryExists.mockReset();
    mockPlatform.mockReset();

    // Default platform to darwin
    mockPlatform.mockReturnValue('darwin');

    mockToolInstallerService = createMockToolInstallerService();
    service = new EnvironmentDetectorServiceImpl(mockToolInstallerService as any);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // detectDefaults()
  // ---------------------------------------------------------------------------
  describe('detectDefaults()', () => {
    // -------------------------------------------------------------------------
    // Editor detection
    // -------------------------------------------------------------------------
    describe('editor detection', () => {
      it('detects VS Code from VISUAL=code', () => {
        process.env.VISUAL = 'code';

        const result = service.detectDefaults();

        expect(result.defaultEditor).toBe(EditorType.VsCode);
      });

      it('detects Cursor from EDITOR with full path, extracting basename', () => {
        process.env.EDITOR = '/usr/bin/cursor';

        const result = service.detectDefaults();

        expect(result.defaultEditor).toBe(EditorType.Cursor);
      });

      it('detects Windsurf from VISUAL=windsurf', () => {
        process.env.VISUAL = 'windsurf';

        const result = service.detectDefaults();

        expect(result.defaultEditor).toBe(EditorType.Windsurf);
      });

      it('detects Zed from EDITOR=zed', () => {
        process.env.EDITOR = 'zed';

        const result = service.detectDefaults();

        expect(result.defaultEditor).toBe(EditorType.Zed);
      });

      it('detects Antigravity from VISUAL=agy (macOS binary name)', () => {
        process.env.VISUAL = 'agy';

        const result = service.detectDefaults();

        expect(result.defaultEditor).toBe(EditorType.Antigravity);
      });

      it('detects Antigravity from VISUAL=antigravity (Linux binary name)', () => {
        process.env.VISUAL = 'antigravity';

        const result = service.detectDefaults();

        expect(result.defaultEditor).toBe(EditorType.Antigravity);
      });

      it('gives VISUAL precedence over EDITOR when both are set', () => {
        process.env.VISUAL = 'code';
        process.env.EDITOR = 'cursor';

        const result = service.detectDefaults();

        expect(result.defaultEditor).toBe(EditorType.VsCode);
      });

      it('returns null when neither VISUAL nor EDITOR is set', () => {
        const result = service.detectDefaults();

        expect(result.defaultEditor).toBeNull();
      });

      it('returns null for an unknown editor binary', () => {
        process.env.EDITOR = 'vim';

        const result = service.detectDefaults();

        expect(result.defaultEditor).toBeNull();
      });
    });

    // -------------------------------------------------------------------------
    // Shell detection
    // -------------------------------------------------------------------------
    describe('shell detection', () => {
      it('detects zsh from SHELL=/bin/zsh', () => {
        process.env.SHELL = '/bin/zsh';

        const result = service.detectDefaults();

        expect(result.defaultShell).toBe('zsh');
      });

      it('detects bash from SHELL=/bin/bash', () => {
        process.env.SHELL = '/bin/bash';

        const result = service.detectDefaults();

        expect(result.defaultShell).toBe('bash');
      });

      it('detects fish from SHELL=/usr/bin/fish', () => {
        process.env.SHELL = '/usr/bin/fish';

        const result = service.detectDefaults();

        expect(result.defaultShell).toBe('fish');
      });

      it('maps /bin/sh to bash as a fallback', () => {
        process.env.SHELL = '/bin/sh';

        const result = service.detectDefaults();

        expect(result.defaultShell).toBe('bash');
      });

      it('detects powershell on Windows when PSModulePath is set', () => {
        mockPlatform.mockReturnValue('win32');
        process.env.PSModulePath = 'C:\\Program Files\\PowerShell\\Modules';

        const result = service.detectDefaults();

        expect(result.defaultShell).toBe('powershell');
      });

      it('falls back to bash on Windows when PSModulePath is not set', () => {
        mockPlatform.mockReturnValue('win32');

        const result = service.detectDefaults();

        expect(result.defaultShell).toBe('bash');
      });

      it('returns null on non-Windows when SHELL is not set', () => {
        mockPlatform.mockReturnValue('darwin');

        const result = service.detectDefaults();

        expect(result.defaultShell).toBeNull();
      });
    });

    // -------------------------------------------------------------------------
    // Terminal detection
    // -------------------------------------------------------------------------
    describe('terminal detection', () => {
      it('detects Warp from TERM_PROGRAM=WarpTerminal', () => {
        process.env.TERM_PROGRAM = 'WarpTerminal';

        const result = service.detectDefaults();

        expect(result.defaultTerminal).toBe(TerminalType.Warp);
      });

      it('detects iTerm2 from TERM_PROGRAM=iTerm.app', () => {
        process.env.TERM_PROGRAM = 'iTerm.app';

        const result = service.detectDefaults();

        expect(result.defaultTerminal).toBe(TerminalType.ITerm2);
      });

      it('detects System terminal from TERM_PROGRAM=Apple_Terminal', () => {
        process.env.TERM_PROGRAM = 'Apple_Terminal';

        const result = service.detectDefaults();

        expect(result.defaultTerminal).toBe(TerminalType.System);
      });

      it('falls back to TERM when TERM_PROGRAM is not set', () => {
        process.env.TERM = 'alacritty';

        const result = service.detectDefaults();

        expect(result.defaultTerminal).toBe(TerminalType.Alacritty);
      });

      it('detects Kitty from TERM=xterm-kitty fallback', () => {
        process.env.TERM = 'xterm-kitty';

        const result = service.detectDefaults();

        expect(result.defaultTerminal).toBe(TerminalType.Kitty);
      });

      it('returns null when neither TERM_PROGRAM nor TERM is set', () => {
        const result = service.detectDefaults();

        expect(result.defaultTerminal).toBeNull();
      });

      it('returns null for an unknown TERM_PROGRAM value', () => {
        process.env.TERM_PROGRAM = 'SomeOther';

        const result = service.detectDefaults();

        expect(result.defaultTerminal).toBeNull();
      });
    });

    // -------------------------------------------------------------------------
    // Combined detection
    // -------------------------------------------------------------------------
    describe('combined detection', () => {
      it('returns all three defaults when all env vars are set', () => {
        process.env.VISUAL = 'code';
        process.env.SHELL = '/bin/zsh';
        process.env.TERM_PROGRAM = 'WarpTerminal';

        const result = service.detectDefaults();

        expect(result).toEqual({
          defaultEditor: EditorType.VsCode,
          defaultShell: 'zsh',
          defaultTerminal: TerminalType.Warp,
        });
      });

      it('returns all nulls when no env vars are set on macOS', () => {
        mockPlatform.mockReturnValue('darwin');

        const result = service.detectDefaults();

        expect(result).toEqual({
          defaultEditor: null,
          defaultShell: null,
          defaultTerminal: null,
        });
      });
    });
  });

  // ---------------------------------------------------------------------------
  // listAvailableEditors()
  // ---------------------------------------------------------------------------
  describe('listAvailableEditors()', () => {
    it('returns all editors as available when checkAvailability says so', async () => {
      const mockCheckAvailability = vi.mocked(mockToolInstallerService.checkAvailability);
      mockCheckAvailability.mockImplementation(async (toolId: string) =>
        createAvailableStatus(toolId)
      );

      const result = await service.listAvailableEditors();

      expect(result).toHaveLength(5);
      expect(result.every((e) => e.available)).toBe(true);
    });

    it('returns only VS Code as available when others are missing', async () => {
      const mockCheckAvailability = vi.mocked(mockToolInstallerService.checkAvailability);
      mockCheckAvailability.mockImplementation(async (toolId: string) => {
        if (toolId === 'vscode') {
          return createAvailableStatus(toolId);
        }
        return createMissingStatus(toolId, []);
      });

      const result = await service.listAvailableEditors();

      expect(result).toHaveLength(5);
      const vscode = result.find((e) => e.id === EditorType.VsCode);
      expect(vscode?.available).toBe(true);

      const others = result.filter((e) => e.id !== EditorType.VsCode);
      expect(others.every((e) => !e.available)).toBe(true);
    });

    it('returns exactly 5 entries in the correct order with correct metadata', async () => {
      const mockCheckAvailability = vi.mocked(mockToolInstallerService.checkAvailability);
      mockCheckAvailability.mockImplementation(async (toolId: string) =>
        createMissingStatus(toolId, [])
      );

      const result = await service.listAvailableEditors();

      expect(result).toHaveLength(5);
      expect(result[0]).toEqual({ id: EditorType.VsCode, name: 'VS Code', available: false });
      expect(result[1]).toEqual({ id: EditorType.Cursor, name: 'Cursor', available: false });
      expect(result[2]).toEqual({ id: EditorType.Windsurf, name: 'Windsurf', available: false });
      expect(result[3]).toEqual({ id: EditorType.Zed, name: 'Zed', available: false });
      expect(result[4]).toEqual({
        id: EditorType.Antigravity,
        name: 'Antigravity',
        available: false,
      });
    });

    it('calls checkAvailability with correct tool IDs', async () => {
      const mockCheckAvailability = vi.mocked(mockToolInstallerService.checkAvailability);
      mockCheckAvailability.mockImplementation(async (toolId: string) =>
        createMissingStatus(toolId, [])
      );

      await service.listAvailableEditors();

      expect(mockCheckAvailability).toHaveBeenCalledTimes(5);
      expect(mockCheckAvailability).toHaveBeenCalledWith('vscode');
      expect(mockCheckAvailability).toHaveBeenCalledWith('cursor');
      expect(mockCheckAvailability).toHaveBeenCalledWith('windsurf');
      expect(mockCheckAvailability).toHaveBeenCalledWith('zed');
      expect(mockCheckAvailability).toHaveBeenCalledWith('antigravity');
    });
  });

  // ---------------------------------------------------------------------------
  // listAvailableShells()
  // ---------------------------------------------------------------------------
  describe('listAvailableShells()', () => {
    it('marks bash and zsh as available when binaries are found', async () => {
      mockCheckBinaryExists.mockImplementation(async (binary: string) => {
        if (binary === 'bash' || binary === 'zsh') {
          return { found: true };
        }
        return { found: false };
      });

      const result = await service.listAvailableShells();

      const bash = result.find((e) => e.id === 'bash');
      const zsh = result.find((e) => e.id === 'zsh');
      expect(bash?.available).toBe(true);
      expect(zsh?.available).toBe(true);
    });

    it('marks fish as unavailable when binary is not found', async () => {
      mockCheckBinaryExists.mockImplementation(async (binary: string) => {
        if (binary === 'fish') {
          return { found: false };
        }
        return { found: true };
      });

      const result = await service.listAvailableShells();

      const fish = result.find((e) => e.id === 'fish');
      expect(fish?.available).toBe(false);
    });

    it('checks pwsh first for PowerShell, then falls back to powershell binary', async () => {
      // pwsh not found, powershell found
      mockCheckBinaryExists.mockImplementation(async (binary: string) => {
        if (binary === 'pwsh') {
          return { found: false };
        }
        if (binary === 'powershell') {
          return { found: true };
        }
        return { found: true };
      });

      const result = await service.listAvailableShells();

      const ps = result.find((e) => e.id === 'powershell');
      expect(ps?.available).toBe(true);

      // Verify pwsh was checked before powershell
      const calls = mockCheckBinaryExists.mock.calls.map((c) => c[0]);
      const pwshIndex = calls.indexOf('pwsh');
      const powershellIndex = calls.indexOf('powershell');
      expect(pwshIndex).toBeLessThan(powershellIndex);
    });

    it('marks PowerShell available when pwsh is found without checking powershell binary', async () => {
      mockCheckBinaryExists.mockImplementation(async (binary: string) => {
        if (binary === 'pwsh') {
          return { found: true };
        }
        return { found: true };
      });

      const result = await service.listAvailableShells();

      const ps = result.find((e) => e.id === 'powershell');
      expect(ps?.available).toBe(true);

      // powershell binary should not be checked when pwsh is found
      const calls = mockCheckBinaryExists.mock.calls.map((c) => c[0]);
      expect(calls).not.toContain('powershell');
    });

    it('excludes zsh and fish on win32 platform', async () => {
      mockPlatform.mockReturnValue('win32');
      mockCheckBinaryExists.mockResolvedValue({ found: true });

      // Recreate service to pick up the new platform
      service = new EnvironmentDetectorServiceImpl(mockToolInstallerService as any);
      const result = await service.listAvailableShells();

      const ids = result.map((e) => e.id);
      expect(ids).toContain('bash');
      expect(ids).toContain('powershell');
      expect(ids).not.toContain('zsh');
      expect(ids).not.toContain('fish');
    });

    it('includes zsh and fish on darwin platform', async () => {
      mockPlatform.mockReturnValue('darwin');
      mockCheckBinaryExists.mockResolvedValue({ found: true });

      const result = await service.listAvailableShells();

      const ids = result.map((e) => e.id);
      expect(ids).toContain('bash');
      expect(ids).toContain('zsh');
      expect(ids).toContain('fish');
      expect(ids).toContain('powershell');
    });

    it('includes zsh and fish on linux platform', async () => {
      mockPlatform.mockReturnValue('linux');
      mockCheckBinaryExists.mockResolvedValue({ found: true });

      const result = await service.listAvailableShells();

      const ids = result.map((e) => e.id);
      expect(ids).toContain('bash');
      expect(ids).toContain('zsh');
      expect(ids).toContain('fish');
      expect(ids).toContain('powershell');
    });

    it('returns entries with correct name metadata', async () => {
      mockPlatform.mockReturnValue('darwin');
      mockCheckBinaryExists.mockResolvedValue({ found: false });

      const result = await service.listAvailableShells();

      const nameMap = Object.fromEntries(result.map((e) => [e.id, e.name]));
      expect(nameMap['bash']).toBe('Bash');
      expect(nameMap['zsh']).toBe('Zsh');
      expect(nameMap['fish']).toBe('Fish');
      expect(nameMap['powershell']).toBe('PowerShell');
    });
  });
});
