import type { Settings } from '../../../../domain/generated/output.js';

/**
 * Port for reading application settings.
 * Replaces direct use of the getSettings()/hasSettings() global accessor.
 */
export interface ISettingsReader {
  /** Returns true if settings have been initialized */
  hasSettings(): boolean;
  /** Returns current settings, or undefined if not initialized */
  getSettings(): Settings | undefined;
}

export const ISettingsReader = 'ISettingsReader' as const;
