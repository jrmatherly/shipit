'use server';

import { statSync } from 'node:fs';
import { join } from 'node:path';
import { resolve } from '@/lib/server-container';
import type { LoadSettingsUseCase } from '@shipit-ai/core/application/use-cases/settings/load-settings.use-case';
import { getShipitAiHomeDir } from '@shipit-ai/core/infrastructure/services/filesystem/shipit-ai-directory.service';
import type { Settings } from '@shipit-ai/core/domain/generated/output';

export interface LoadSettingsResult {
  settings?: Settings;
  shipitAiHome?: string;
  dbFileSize?: string;
  error?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function loadSettings(): Promise<LoadSettingsResult> {
  try {
    const useCase = resolve<LoadSettingsUseCase>('LoadSettingsUseCase');
    const settings = await useCase.execute();

    const shipitAiHome = getShipitAiHomeDir();
    let dbFileSize = 'Unknown';
    try {
      const dbPath = join(shipitAiHome, 'data');
      const stat = statSync(dbPath);
      dbFileSize = formatFileSize(stat.size);
    } catch {
      // DB file may not exist yet
    }

    return { settings, shipitAiHome, dbFileSize };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load settings';
    return { error: message };
  }
}
