/**
 * Repository Test Factory
 *
 * Shared builder function for creating Repository test fixtures with sensible defaults.
 * Use the `overrides` parameter to customize any field for a specific test scenario.
 *
 * @example
 * ```typescript
 * const repo = createMockRepository();
 * const deletedRepo = createMockRepository({ deletedAt: new Date() });
 * const repoWithRemote = createMockRepository({ remoteUrl: 'https://github.com/org/project' });
 * ```
 */

import type { Repository } from '@/domain/generated/output.js';

export function createMockRepository(overrides?: Partial<Repository>): Repository {
  return {
    id: 'repo-test-001',
    name: 'test-project',
    path: '/repos/test-project',
    createdAt: new Date('2025-01-01T10:00:00Z'),
    updatedAt: new Date('2025-01-01T10:00:00Z'),
    ...overrides,
  };
}
