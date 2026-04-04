/**
 * Initialize Settings Use Case
 *
 * Handles first-time settings initialization.
 * Creates default settings if none exist, or returns existing settings.
 * When creating new settings, auto-detects OS environment defaults for
 * editor, shell, and terminal preferences.
 *
 * Business Rules:
 * - Only one Settings record allowed (singleton pattern)
 * - Uses factory defaults for initial values, enhanced with OS detection
 * - Detection failure must never block settings initialization
 * - Idempotent: safe to call multiple times
 */

import { injectable, inject } from 'tsyringe';
import type { Settings } from '../../../domain/generated/output.js';
import { EditorType, TerminalType } from '../../../domain/generated/output.js';
import type { ISettingsRepository } from '../../ports/output/repositories/settings.repository.interface.js';
import type { IEnvironmentDetectorService } from '../../ports/output/services/environment-detector.service.js';
import { createDefaultSettings } from '../../../domain/factories/settings-defaults.factory.js';

/**
 * Use case for initializing global settings.
 *
 * Algorithm:
 * 1. Check if settings already exist (load from repository)
 * 2. If exists, return existing settings
 * 3. If not exists, detect OS environment defaults
 * 4. Create defaults with detected overrides and initialize in repository
 * 5. Return newly created settings
 */
@injectable()
export class InitializeSettingsUseCase {
  constructor(
    @inject('ISettingsRepository')
    private readonly settingsRepository: ISettingsRepository,
    @inject('IEnvironmentDetectorService')
    private readonly envDetector: IEnvironmentDetectorService
  ) {}

  /**
   * Execute the initialize settings use case.
   *
   * @returns Existing or newly created Settings
   */
  async execute(): Promise<Settings> {
    // Check if settings already exist
    const existingSettings = await this.settingsRepository.load();

    if (existingSettings) {
      return existingSettings;
    }

    // Try to detect OS defaults for environment settings
    let overrides:
      | {
          defaultEditor?: EditorType;
          shellPreference?: string;
          terminalPreference?: TerminalType;
        }
      | undefined;

    try {
      const detected = this.envDetector.detectDefaults();
      overrides = {
        ...(detected.defaultEditor != null && { defaultEditor: detected.defaultEditor }),
        ...(detected.defaultShell != null && { shellPreference: detected.defaultShell }),
        ...(detected.defaultTerminal != null && {
          terminalPreference: detected.defaultTerminal,
        }),
      };
      // Only pass overrides if there's at least one detected value
      if (Object.keys(overrides).length === 0) {
        overrides = undefined;
      }
    } catch {
      // Detection failure must not block settings initialization
      overrides = undefined;
    }

    // Create new settings with defaults (enhanced with detected overrides)
    const newSettings = createDefaultSettings(overrides);

    // Persist to database
    await this.settingsRepository.initialize(newSettings);

    return newSettings;
  }
}
