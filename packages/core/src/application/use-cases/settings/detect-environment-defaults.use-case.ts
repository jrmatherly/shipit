/**
 * Detect Environment Defaults Use Case
 *
 * Probes the user's system to detect their default editor, shell, and terminal,
 * and lists all available editors and shells with availability status.
 * Used during onboarding to pre-populate settings with sensible defaults.
 */

import { injectable, inject } from 'tsyringe';
import type {
  IEnvironmentDetectorService,
  DetectedEnvironment,
  AvailableEditorEntry,
  AvailableShellEntry,
} from '../../ports/output/services/environment-detector.service.js';

@injectable()
export class DetectEnvironmentDefaultsUseCase {
  constructor(
    @inject('IEnvironmentDetectorService')
    private readonly envDetector: IEnvironmentDetectorService
  ) {}

  async execute(): Promise<{
    detected: DetectedEnvironment;
    availableEditors: AvailableEditorEntry[];
    availableShells: AvailableShellEntry[];
  }> {
    const [detected, availableEditors, availableShells] = await Promise.all([
      Promise.resolve(this.envDetector.detectDefaults()),
      this.envDetector.listAvailableEditors(),
      this.envDetector.listAvailableShells(),
    ]);
    return { detected, availableEditors, availableShells };
  }
}
