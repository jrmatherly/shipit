import { injectable } from 'tsyringe';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import type { IFileSystemService } from '../../../application/ports/output/services/filesystem-service.interface.js';
import { getShipitAiHomeDir } from './shipit-ai-directory.service.js';

/**
 * Platform-specific filesystem path resolution service.
 * Wraps getShipitAiHomeDir() and computeWorktreePath() behind a DI-injectable interface.
 */
@injectable()
export class FileSystemService implements IFileSystemService {
  getHomeDir(): string {
    return getShipitAiHomeDir();
  }

  computeWorktreePath(repoPath: string, branch: string): string {
    // Normalize separators before hashing so C:\foo and C:/foo produce the same hash
    const normalizedRepoPath = repoPath.replace(/\\/g, '/');
    const repoHash = createHash('sha256').update(normalizedRepoPath).digest('hex').slice(0, 16);
    const slug = branch.replace(/\//g, '-');
    return join(getShipitAiHomeDir(), 'repos', repoHash, 'wt', slug).replace(/\\/g, '/');
  }
}
