import {
  GitPrError,
  GitPrErrorCode,
} from '../../../application/ports/output/services/git-pr-service.interface.js';

export function parseGitError(error: unknown): GitPrError {
  const message = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error ? error : undefined;

  // Rebase-specific: detect "CONFLICT" during rebase operations
  if (message.includes('CONFLICT') && message.includes('rebase')) {
    return new GitPrError(message, GitPrErrorCode.REBASE_CONFLICT, cause);
  }
  // Sync-specific: non-fast-forward or diverged branch
  if (message.includes('non-fast-forward') || message.includes('diverged')) {
    return new GitPrError(message, GitPrErrorCode.SYNC_FAILED, cause);
  }
  if (message.includes('rejected') || message.includes('conflict')) {
    return new GitPrError(message, GitPrErrorCode.MERGE_CONFLICT, cause);
  }
  if (message.includes('Authentication') || message.includes('auth') || message.includes('403')) {
    return new GitPrError(message, GitPrErrorCode.AUTH_FAILURE, cause);
  }

  return new GitPrError(message, GitPrErrorCode.GIT_ERROR, cause);
}

export function parseGhError(error: unknown): GitPrError {
  const message = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error ? error : undefined;
  const errnoCode = (error as NodeJS.ErrnoException)?.code;

  if (errnoCode === 'ENOENT' || message.includes('ENOENT')) {
    return new GitPrError(message, GitPrErrorCode.GH_NOT_FOUND, cause);
  }
  if (message.includes('Authentication') || message.includes('auth') || message.includes('403')) {
    return new GitPrError(message, GitPrErrorCode.AUTH_FAILURE, cause);
  }

  return new GitPrError(message, GitPrErrorCode.GIT_ERROR, cause);
}
