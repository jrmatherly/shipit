/**
 * SessionRepositoryBase Unit Tests
 *
 * Tests the shared base class logic using a concrete TestSessionRepository
 * that exposes protected methods and provides controllable mock data.
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as os from 'node:os';
import * as path from 'node:path';
import type { AgentSession } from '@shipit-ai/core/domain/generated/output.js';
import type { ListSessionsOptions } from '@shipit-ai/core/application/ports/output/agents/agent-session-repository.interface.js';
import {
  SessionRepositoryBase,
  type SessionFileInfo,
} from '@/infrastructure/services/agents/sessions/session-repository-base.js';

/** Concrete test subclass with controllable mock data */
class TestSessionRepository extends SessionRepositoryBase {
  public mockFileInfos: SessionFileInfo[] = [];
  public mockSessions = new Map<string, AgentSession | null>();
  public collectCallCount = 0;
  public parseCallLog: { id: string; includeMessages: boolean }[] = [];

  protected async collectSessionFiles(_projectPath?: string): Promise<SessionFileInfo[]> {
    this.collectCallCount++;
    return this.mockFileInfos;
  }

  protected async findSessionFile(
    id: string
  ): Promise<{ filePath: string; resolvedId: string } | null> {
    return this.findByIdInFileInfos(this.mockFileInfos, id);
  }

  protected async parseSessionFile(
    fileInfo: SessionFileInfo,
    options: { includeMessages: boolean; messageLimit?: number }
  ): Promise<AgentSession | null> {
    this.parseCallLog.push({ id: fileInfo.id, includeMessages: options.includeMessages });
    return this.mockSessions.get(fileInfo.id) ?? null;
  }

  // Expose protected methods for direct testing
  public testAbbreviatePath(p: string): string {
    return this.abbreviatePath(p);
  }

  public testFindByIdInFileInfos(
    infos: SessionFileInfo[],
    id: string
  ): { filePath: string; resolvedId: string } | null {
    return this.findByIdInFileInfos(infos, id);
  }
}

function makeFileInfo(id: string, mtimeIso: string): SessionFileInfo {
  return { id, filePath: `/fake/sessions/${id}.jsonl`, mtime: new Date(mtimeIso) };
}

function makeSession(id: string, overrides?: Partial<AgentSession>): AgentSession {
  return {
    id,
    agentType: 'claude-code' as AgentSession['agentType'],
    projectPath: '~/project',
    messageCount: 3,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    ...overrides,
  };
}

describe('SessionRepositoryBase', () => {
  let repo: TestSessionRepository;

  beforeEach(() => {
    repo = new TestSessionRepository('/fake/base');
  });

  describe('isSupported()', () => {
    it('should return true', () => {
      expect(repo.isSupported()).toBe(true);
    });
  });

  describe('list()', () => {
    it('should return sessions sorted by mtime descending', async () => {
      const fi1 = makeFileInfo('oldest', '2026-01-01T00:00:00Z');
      const fi2 = makeFileInfo('middle', '2026-01-02T00:00:00Z');
      const fi3 = makeFileInfo('newest', '2026-01-03T00:00:00Z');
      repo.mockFileInfos = [fi1, fi3, fi2]; // intentionally unsorted
      repo.mockSessions.set('newest', makeSession('newest'));
      repo.mockSessions.set('middle', makeSession('middle'));
      repo.mockSessions.set('oldest', makeSession('oldest'));

      const sessions = await repo.list({ limit: 0 });

      expect(sessions.map((s) => s.id)).toEqual(['newest', 'middle', 'oldest']);
    });

    it('should respect limit parameter', async () => {
      const fi1 = makeFileInfo('a', '2026-01-03T00:00:00Z');
      const fi2 = makeFileInfo('b', '2026-01-02T00:00:00Z');
      const fi3 = makeFileInfo('c', '2026-01-01T00:00:00Z');
      repo.mockFileInfos = [fi1, fi2, fi3];
      repo.mockSessions.set('a', makeSession('a'));
      repo.mockSessions.set('b', makeSession('b'));
      repo.mockSessions.set('c', makeSession('c'));

      const sessions = await repo.list({ limit: 2 });

      expect(sessions).toHaveLength(2);
      expect(sessions[0].id).toBe('a');
      expect(sessions[1].id).toBe('b');
    });

    it('should default limit to 20', async () => {
      // Create 25 file infos
      const infos: SessionFileInfo[] = [];
      for (let i = 0; i < 25; i++) {
        const id = `session-${String(i).padStart(2, '0')}`;
        infos.push(makeFileInfo(id, `2026-01-${String(25 - i).padStart(2, '0')}T00:00:00Z`));
        repo.mockSessions.set(id, makeSession(id));
      }
      repo.mockFileInfos = infos;

      const sessions = await repo.list();

      expect(sessions).toHaveLength(20);
    });

    it('should handle empty file list', async () => {
      repo.mockFileInfos = [];

      const sessions = await repo.list();

      expect(sessions).toEqual([]);
    });

    it('should skip null parse results', async () => {
      const fi1 = makeFileInfo('valid', '2026-01-02T00:00:00Z');
      const fi2 = makeFileInfo('sparse', '2026-01-01T00:00:00Z');
      repo.mockFileInfos = [fi1, fi2];
      repo.mockSessions.set('valid', makeSession('valid'));
      // 'sparse' not in mockSessions → returns null

      const sessions = await repo.list({ limit: 0 });

      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe('valid');
    });

    it('should call parseSessionFile with includeMessages: false', async () => {
      const fi = makeFileInfo('x', '2026-01-01T00:00:00Z');
      repo.mockFileInfos = [fi];
      repo.mockSessions.set('x', makeSession('x'));

      await repo.list();

      expect(repo.parseCallLog).toEqual([{ id: 'x', includeMessages: false }]);
    });

    it('should pass projectPath through to collectSessionFiles', async () => {
      const collectSpy = vi.spyOn(repo as TestSessionRepository, 'collectSessionFiles' as never);
      await repo.list({ projectPath: '/my/project' } as ListSessionsOptions);

      expect(collectSpy).toHaveBeenCalledWith('/my/project');
    });
  });

  describe('findById()', () => {
    it('should return null when no file matches', async () => {
      repo.mockFileInfos = [];

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null when stat fails', async () => {
      // findSessionFile will match but fs.stat on the fake path will fail
      const fi = makeFileInfo('abc-123', '2026-01-01T00:00:00Z');
      repo.mockFileInfos = [fi];
      repo.mockSessions.set('abc-123', makeSession('abc-123'));

      const result = await repo.findById('abc-123');

      // stat will fail on fake path → returns null
      expect(result).toBeNull();
    });
  });

  describe('abbreviatePath()', () => {
    it('should replace home directory with ~', () => {
      const home = os.homedir();
      const result = repo.testAbbreviatePath(`${home}${path.sep}projects${path.sep}app`);
      expect(result).toBe(`~${path.sep}projects${path.sep}app`);
    });

    it('should handle exact home directory path', () => {
      const home = os.homedir();
      expect(repo.testAbbreviatePath(home)).toBe('~');
    });

    it('should pass through non-home paths unchanged', () => {
      expect(repo.testAbbreviatePath('/opt/projects/app')).toBe('/opt/projects/app');
    });
  });

  describe('findByIdInFileInfos()', () => {
    const infos: SessionFileInfo[] = [
      makeFileInfo('abc-111-full', '2026-01-01T00:00:00Z'),
      makeFileInfo('abc-222-full', '2026-01-02T00:00:00Z'),
      makeFileInfo('def-333-full', '2026-01-03T00:00:00Z'),
    ];

    it('should find by exact match', () => {
      const result = repo.testFindByIdInFileInfos(infos, 'abc-111-full');
      expect(result).toEqual({
        filePath: '/fake/sessions/abc-111-full.jsonl',
        resolvedId: 'abc-111-full',
      });
    });

    it('should prefer exact match over prefix match', () => {
      const infosWithExact: SessionFileInfo[] = [
        makeFileInfo('abc', '2026-01-01T00:00:00Z'),
        makeFileInfo('abc-extended', '2026-01-02T00:00:00Z'),
      ];
      const result = repo.testFindByIdInFileInfos(infosWithExact, 'abc');
      expect(result?.resolvedId).toBe('abc');
    });

    it('should find by single prefix match', () => {
      const result = repo.testFindByIdInFileInfos(infos, 'def-333');
      expect(result).toEqual({
        filePath: '/fake/sessions/def-333-full.jsonl',
        resolvedId: 'def-333-full',
      });
    });

    it('should return null for ambiguous prefix match', () => {
      // Both abc-111-full and abc-222-full start with 'abc'
      const result = repo.testFindByIdInFileInfos(infos, 'abc');
      expect(result).toBeNull();
    });

    it('should return null when no match exists', () => {
      const result = repo.testFindByIdInFileInfos(infos, 'zzz');
      expect(result).toBeNull();
    });

    it('should return null for empty file list', () => {
      const result = repo.testFindByIdInFileInfos([], 'abc');
      expect(result).toBeNull();
    });
  });
});
