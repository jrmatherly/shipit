'use server';

import { isAbsolute } from 'node:path';
import { resolve } from '@/lib/server-container';
import type { LoadSettingsUseCase } from '@shipit-ai/core/application/use-cases/settings/load-settings.use-case';
import type { LaunchIdeUseCase } from '@shipit-ai/core/application/use-cases/ide/launch-ide.use-case';

interface OpenIdeInput {
  repositoryPath: string;
  branch?: string;
}

export async function openIde(
  input: OpenIdeInput
): Promise<{ success: boolean; error?: string; editor?: string; path?: string }> {
  const { repositoryPath, branch } = input;

  if (!repositoryPath || !isAbsolute(repositoryPath)) {
    return { success: false, error: 'repositoryPath must be an absolute path' };
  }

  const loadSettings = resolve<LoadSettingsUseCase>('LoadSettingsUseCase');
  const settings = await loadSettings.execute();
  const editor = settings.environment.defaultEditor;

  const useCase = resolve<LaunchIdeUseCase>('LaunchIdeUseCase');
  const result = await useCase.execute({
    editorId: editor,
    repositoryPath,
    branch,
    checkAvailability: true,
  });

  if (!result.ok) {
    return { success: false, error: result.message };
  }

  return { success: true, editor: result.editorName, path: result.worktreePath };
}
