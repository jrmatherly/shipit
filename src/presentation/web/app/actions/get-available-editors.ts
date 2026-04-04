'use server';

import { resolve } from '@/lib/server-container';
import type { IEnvironmentDetectorService } from '@shipit-ai/core/application/ports/output/services/environment-detector.service';

export interface AvailableEditor {
  id: string;
  name: string;
  available: boolean;
}

/**
 * Returns the list of editor entries from the DI container's IEnvironmentDetectorService,
 * with availability checks based on binary existence on the current system.
 *
 * Using the DI container (not a direct import) ensures the service is resolved
 * in the correct Node.js bootstrap context where tool metadata paths resolve correctly.
 */
export async function getAvailableEditors(): Promise<AvailableEditor[]> {
  try {
    const service = resolve<IEnvironmentDetectorService>('IEnvironmentDetectorService');
    return await service.listAvailableEditors();
  } catch {
    return [
      { id: 'vscode', name: 'VS Code', available: true },
      { id: 'cursor', name: 'Cursor', available: true },
      { id: 'windsurf', name: 'Windsurf', available: true },
      { id: 'zed', name: 'Zed', available: true },
      { id: 'antigravity', name: 'Antigravity', available: true },
    ];
  }
}
