/**
 * Environment Detector Service Interface
 *
 * Output port for detecting the user's development environment defaults.
 * Implementations probe environment variables, PATH binaries, and platform
 * conventions to determine editor, shell, and terminal preferences.
 */

import type { EditorType, TerminalType } from '../../../../domain/generated/output.js';

/**
 * Auto-detected environment defaults derived from environment variables
 * and platform conventions.
 */
export interface DetectedEnvironment {
  defaultEditor: EditorType | null;
  defaultShell: string | null;
  defaultTerminal: TerminalType | null;
}

/**
 * Entry describing an editor's availability on the current system.
 */
export interface AvailableEditorEntry {
  id: EditorType;
  name: string;
  available: boolean;
}

/**
 * Entry describing a shell's availability on the current system.
 */
export interface AvailableShellEntry {
  id: string;
  name: string;
  available: boolean;
}

/**
 * Service interface for detecting the user's development environment.
 */
export interface IEnvironmentDetectorService {
  /**
   * Detect default editor, shell, and terminal from environment variables.
   * This is a synchronous probe of process.env — no I/O required.
   */
  detectDefaults(): DetectedEnvironment;

  /**
   * List all known editors with their availability status on the current system.
   * Uses tool metadata and binary checks to determine availability.
   */
  listAvailableEditors(): Promise<AvailableEditorEntry[]>;

  /**
   * List all known shells with their availability status on the current system.
   * Uses binary existence checks, filtered by platform.
   */
  listAvailableShells(): Promise<AvailableShellEntry[]>;
}
