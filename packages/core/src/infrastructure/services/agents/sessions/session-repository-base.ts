import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import type { AgentSession } from '../../../../domain/generated/output.js';
import type {
  IAgentSessionRepository,
  ListSessionsOptions,
  GetSessionOptions,
} from '../../../../application/ports/output/agents/agent-session-repository.interface.js';

export interface SessionFileInfo {
  id: string;
  filePath: string;
  mtime: Date;
  threadName?: string;
}

export abstract class SessionRepositoryBase implements IAgentSessionRepository {
  constructor(protected readonly basePath: string) {}

  isSupported(): boolean {
    return true;
  }

  async list(options?: ListSessionsOptions): Promise<AgentSession[]> {
    const limit = options?.limit ?? 20;

    const fileInfos = await this.collectSessionFiles(options?.projectPath);
    fileInfos.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    const toParse = limit > 0 ? fileInfos.slice(0, limit) : fileInfos;

    const parseResults = await Promise.allSettled(
      toParse.map((fi) => this.parseSessionFile(fi, { includeMessages: false }))
    );

    const sessions: AgentSession[] = [];
    for (const result of parseResults) {
      if (result.status === 'fulfilled' && result.value !== null) {
        sessions.push(result.value);
      }
    }

    return sessions;
  }

  async findById(id: string, options?: GetSessionOptions): Promise<AgentSession | null> {
    const messageLimit = options?.messageLimit ?? 20;

    const match = await this.findSessionFile(id);
    if (match === null) return null;

    try {
      const stat = await fs.stat(match.filePath);
      const fileInfo: SessionFileInfo = {
        id: match.resolvedId,
        filePath: match.filePath,
        mtime: stat.mtime,
      };
      return await this.parseSessionFile(fileInfo, { includeMessages: true, messageLimit });
    } catch {
      return null;
    }
  }

  protected abstract collectSessionFiles(projectPath?: string): Promise<SessionFileInfo[]>;

  protected abstract findSessionFile(
    id: string
  ): Promise<{ filePath: string; resolvedId: string } | null>;

  protected abstract parseSessionFile(
    fileInfo: SessionFileInfo,
    options: { includeMessages: boolean; messageLimit?: number }
  ): Promise<AgentSession | null>;

  protected abbreviatePath(filePath: string): string {
    const home = os.homedir();
    if (filePath === home) return '~';
    if (filePath.startsWith(`${home}${path.sep}`)) {
      return `~${filePath.slice(home.length)}`;
    }
    return filePath;
  }

  protected findByIdInFileInfos(
    fileInfos: SessionFileInfo[],
    id: string
  ): { filePath: string; resolvedId: string } | null {
    for (const fi of fileInfos) {
      if (fi.id === id) {
        return { filePath: fi.filePath, resolvedId: fi.id };
      }
    }

    const matches = fileInfos.filter((fi) => fi.id.startsWith(id));
    if (matches.length === 1) {
      return { filePath: matches[0].filePath, resolvedId: matches[0].id };
    }

    return null;
  }
}
