/**
 * DI smoke test: every string token used by web server actions must resolve.
 *
 * This test scans all server actions in src/presentation/web/app/actions/ for
 * calls to resolve<T>('StringToken') and asserts that each token is registered
 * in the DI container after bootstrap. It catches the class of bug introduced
 * in PR #16 where FetchMcpServersUseCase was registered by class token in
 * use-cases.module.ts but never added to web-tokens.module.ts, causing runtime
 * "token not registered" errors that no other test surfaced.
 *
 * The regex-scan approach is intentionally coarse: it matches any literal
 * resolve<T>('Name') call. If a future action uses a dynamic token or a
 * different helper, this test won't cover it — but for the current codebase
 * pattern (string tokens, literal names) it's sufficient and fast.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { DependencyContainer } from 'tsyringe';

// Mock native / heavy dependencies — same mocks as container-idempotency.test.ts
vi.mock('node-notifier', () => ({ default: { notify: vi.fn() } }));
vi.mock('which', () => ({ default: vi.fn().mockResolvedValue(null) }));
vi.mock('better-sqlite3', () => ({
  default: vi.fn().mockReturnValue({
    pragma: vi.fn(),
    exec: vi.fn(),
    prepare: vi.fn().mockReturnValue({
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn(),
    }),
  }),
}));

vi.mock('../../../../packages/core/src/infrastructure/persistence/sqlite/connection.js', () => ({
  getSQLiteConnection: vi.fn().mockResolvedValue({
    pragma: vi.fn(),
    exec: vi.fn(),
    prepare: vi.fn().mockReturnValue({
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn(),
    }),
  }),
}));

vi.mock('../../../../packages/core/src/infrastructure/persistence/sqlite/migrations.js', () => ({
  runSQLiteMigrations: vi.fn().mockResolvedValue(undefined),
}));

vi.mock(
  '../../../../packages/core/src/infrastructure/services/notifications/notification-bus.js',
  () => ({
    getNotificationBus: vi.fn().mockReturnValue({}),
  })
);

vi.mock(
  '../../../../packages/core/src/infrastructure/services/agents/common/checkpointer.js',
  () => ({
    createCheckpointer: vi.fn().mockReturnValue({}),
  })
);

const ACTIONS_DIR = join(__dirname, '../../../../src/presentation/web/app/actions');
const RESOLVE_CALL_REGEX = /resolve<[^>]+>\(\s*'([^']+)'\s*\)/g;

/**
 * Recursively scan a directory for .ts files and collect every string token
 * passed to `resolve<T>('token')`.
 */
function collectStringTokens(dir: string): Set<string> {
  const tokens = new Set<string>();
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      for (const t of collectStringTokens(fullPath)) tokens.add(t);
      continue;
    }

    if (!entry.endsWith('.ts')) continue;

    const content = readFileSync(fullPath, 'utf8');
    for (const match of content.matchAll(RESOLVE_CALL_REGEX)) {
      tokens.add(match[1]);
    }
  }

  return tokens;
}

describe('DI container string token resolution', () => {
  let container: DependencyContainer;
  let tokens: string[];

  beforeAll(async () => {
    const mod = await import('../../../../packages/core/src/infrastructure/di/container.js');
    container = await mod.initializeContainer();
    tokens = Array.from(collectStringTokens(ACTIONS_DIR)).sort();
  });

  it('discovers at least one string token in server actions', () => {
    expect(tokens.length).toBeGreaterThan(0);
  });

  it('every string token used by server actions is registered in the DI container', () => {
    const unregistered: string[] = [];

    for (const token of tokens) {
      if (!container.isRegistered(token)) {
        unregistered.push(token);
      }
    }

    // Fail with the specific missing tokens so the test output is actionable
    const message =
      `Unregistered string tokens found in server actions:\n${unregistered.join('\n')}\n\n` +
      "Every resolve<T>('StringToken') call in src/presentation/web/app/actions/ " +
      "requires a corresponding container.register('StringToken', ...) in " +
      'web-tokens.module.ts.';
    expect(unregistered, message).toEqual([]);
  });

  it('resolves MCP server browser tokens (regression test for PR #17/#18)', () => {
    expect(container.isRegistered('FetchMcpServersUseCase')).toBe(true);
    expect(container.isRegistered('FetchMcpServerToolsUseCase')).toBe(true);
  });

  it('resolves plugin marketplace tokens (canonical reference)', () => {
    expect(container.isRegistered('FetchPluginCatalogUseCase')).toBe(true);
    expect(container.isRegistered('InstallPluginUseCase')).toBe(true);
    expect(container.isRegistered('UninstallPluginUseCase')).toBe(true);
    expect(container.isRegistered('TogglePluginUseCase')).toBe(true);
    expect(container.isRegistered('AddMarketplaceUseCase')).toBe(true);
  });
});
