/**
 * Feature Test Factory
 *
 * Shared builder function for creating Feature test fixtures with sensible defaults.
 * Use the `overrides` parameter to customize any field for a specific test scenario.
 *
 * @example
 * ```typescript
 * const feature = createMockFeature();
 * const archivedFeature = createMockFeature({ lifecycle: SdlcLifecycle.Archived });
 * const featureWithPr = createMockFeature({ pr: { url: '...', number: 42, status: PrStatus.Open } });
 * ```
 */

import type { Feature } from '@/domain/generated/output.js';
import { SdlcLifecycle } from '@/domain/generated/output.js';

export function createMockFeature(overrides?: Partial<Feature>): Feature {
  return {
    id: 'feat-test-001',
    name: 'Test Feature',
    slug: 'test-feature',
    description: 'A test feature for unit tests',
    userQuery: 'implement a test feature',
    repositoryPath: '/repos/test-project',
    branch: 'feat/test-feature',
    lifecycle: SdlcLifecycle.Requirements,
    messages: [],
    relatedArtifacts: [],
    fast: false,
    push: false,
    openPr: false,
    forkAndPr: false,
    commitSpecs: true,
    ciWatchEnabled: true,
    enableEvidence: false,
    commitEvidence: false,
    approvalGates: {
      allowPrd: false,
      allowPlan: false,
      allowMerge: false,
    },
    createdAt: new Date('2025-01-01T10:00:00Z'),
    updatedAt: new Date('2025-01-01T10:00:00Z'),
    ...overrides,
  };
}
