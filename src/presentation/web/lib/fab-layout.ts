/**
 * FAB layout configuration for the web UI.
 *
 * Reads from Settings.fabLayout when available, defaulting to
 * swapPosition = false (Create FAB on start side, Chat FAB on end side).
 */

import { resolve } from '@/lib/server-container';
import type { LoadSettingsUseCase } from '@shipit-ai/core/application/use-cases/settings/load-settings.use-case';

export interface FabLayoutState {
  swapPosition: boolean;
}

export async function getFabLayout(): Promise<FabLayoutState> {
  try {
    const useCase = resolve<LoadSettingsUseCase>('LoadSettingsUseCase');
    const settings = await useCase.execute();
    const fabLayout = settings.fabLayout;
    if (fabLayout) {
      return { swapPosition: fabLayout.swapPosition };
    }
  } catch {
    // Settings not initialized (e.g., during build/SSG or client-side hydration)
  }

  return { swapPosition: false };
}
