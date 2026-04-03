'use server';

import { resolve } from '@/lib/server-container';
import type { ListGitHubRepositoriesUseCase } from '@shipit-ai/core/application/use-cases/repositories/list-github-repositories.use-case';
import type { GitHubRepo } from '@shipit-ai/core/application/ports/output/services/github-repository-service.interface';
import { GitHubAuthError } from '@shipit-ai/core/application/ports/output/services/github-repository-service.interface';

interface ListGitHubRepositoriesInput {
  search?: string;
  limit?: number;
  owner?: string;
}

export async function listGitHubRepositories(
  input?: ListGitHubRepositoriesInput
): Promise<{ repos?: GitHubRepo[]; error?: string }> {
  try {
    const useCase = resolve<ListGitHubRepositoriesUseCase>('ListGitHubRepositoriesUseCase');
    const repos = await useCase.execute(input);
    return { repos };
  } catch (error: unknown) {
    if (error instanceof GitHubAuthError) {
      return { error: 'GitHub CLI is not authenticated. Run `gh auth login` to sign in.' };
    }
    const message = error instanceof Error ? error.message : 'Failed to list repositories';
    return { error: message };
  }
}
