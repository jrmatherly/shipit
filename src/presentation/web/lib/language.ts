/**
 * Server-side language preference utilities for the Web UI.
 *
 * Reads the language preference from the Settings via DI
 * and determines the text direction (LTR/RTL).
 */

import { resolve } from '@/lib/server-container';
import type { LoadSettingsUseCase } from '@shipit-ai/core/application/use-cases/settings/load-settings.use-case';
import { Language } from '@shipit-ai/core/domain/generated/output';

const RTL_LANGUAGES: ReadonlySet<string> = new Set([Language.Arabic, Language.Hebrew]);
const DEFAULT_LANGUAGE = Language.English;

/**
 * Check whether a language code requires right-to-left text direction.
 */
export function isRtlLanguage(language: string): boolean {
  return RTL_LANGUAGES.has(language);
}

interface LanguagePreference {
  language: string;
  dir: 'ltr' | 'rtl';
}

/**
 * Get the user's language preference and computed text direction.
 *
 * Reads from Settings via DI (LoadSettingsUseCase).
 * Falls back to English if settings are not available (e.g. during build).
 */
export async function getLanguagePreference(): Promise<LanguagePreference> {
  let language = DEFAULT_LANGUAGE as string;

  try {
    const useCase = resolve<LoadSettingsUseCase>('LoadSettingsUseCase');
    const settings = await useCase.execute();
    language = settings.user.preferredLanguage ?? DEFAULT_LANGUAGE;
  } catch {
    // Settings not initialized (build, SSG, or first run)
  }

  return {
    language,
    dir: isRtlLanguage(language) ? 'rtl' : 'ltr',
  };
}
