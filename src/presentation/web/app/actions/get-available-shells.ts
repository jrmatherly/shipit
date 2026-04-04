'use server';

import { resolve } from '@/lib/server-container';
import type { IEnvironmentDetectorService } from '@shipit-ai/core/application/ports/output/services/environment-detector.service';

export interface AvailableShell {
  id: string;
  name: string;
  available: boolean;
}

/**
 * Returns the list of shell entries from the DI container's IEnvironmentDetectorService,
 * with availability checks based on binary existence on the current system.
 *
 * Using the DI container (not a direct import) ensures the service is resolved
 * in the correct Node.js bootstrap context where tool metadata paths resolve correctly.
 */
export async function getAvailableShells(): Promise<AvailableShell[]> {
  try {
    const service = resolve<IEnvironmentDetectorService>('IEnvironmentDetectorService');
    return await service.listAvailableShells();
  } catch {
    return [
      { id: 'bash', name: 'Bash', available: true },
      { id: 'zsh', name: 'Zsh', available: true },
      { id: 'fish', name: 'Fish', available: true },
    ];
  }
}
