import { injectable } from 'tsyringe';
import type { ISettingsReader } from '../../application/ports/output/services/settings-reader.interface.js';
import type { Settings } from '../../domain/generated/output.js';
import { getSettings, hasSettings } from './settings.service.js';

@injectable()
export class SettingsReaderService implements ISettingsReader {
  hasSettings(): boolean {
    return hasSettings();
  }

  getSettings(): Settings | undefined {
    try {
      return getSettings();
    } catch {
      return undefined;
    }
  }
}
