/**
 * Port interface for platform-specific filesystem path resolution.
 *
 * Abstracts functions that depend on the filesystem or environment variables
 * (SHIPIT_AI_HOME, homedir, etc.) so that use cases and presentation layers
 * can access paths through DI rather than importing infrastructure directly.
 */
export interface IFileSystemService {
  /**
   * Get the path to the shipit-ai home directory.
   * Uses SHIPIT_AI_HOME env var if set, otherwise defaults to ~/.shipit-ai/
   */
  getHomeDir(): string;

  /**
   * Compute the worktree path for a feature branch within a repository.
   * Normalizes paths for cross-platform consistency.
   */
  computeWorktreePath(repoPath: string, branch: string): string;
}
