// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockLoadSettingsExecute = vi.fn();
vi.mock('@/lib/server-container', () => ({
  resolve: (token: string) => {
    if (token === 'LoadSettingsUseCase') return { execute: mockLoadSettingsExecute };
    throw new Error(`Unknown token: ${token}`);
  },
}));

const { getWorkflowDefaults } =
  await import('../../../../../src/presentation/web/app/actions/get-workflow-defaults.js');

describe('getWorkflowDefaults server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps workflow settings to drawer defaults', async () => {
    mockLoadSettingsExecute.mockResolvedValue({
      workflow: {
        openPrOnImplementationComplete: true,
        ciWatchEnabled: false,
        enableEvidence: false,
        commitEvidence: false,
        defaultFastMode: false,
        approvalGateDefaults: {
          allowPrd: true,
          allowPlan: false,
          allowMerge: true,
          pushOnImplementationComplete: true,
        },
      },
    });

    const result = await getWorkflowDefaults();

    expect(result).toMatchObject({
      approvalGates: {
        allowPrd: true,
        allowPlan: false,
        allowMerge: true,
      },
      push: true,
      openPr: true,
    });
  });

  it('returns all false when workflow defaults are all false', async () => {
    mockLoadSettingsExecute.mockResolvedValue({
      workflow: {
        openPrOnImplementationComplete: false,
        ciWatchEnabled: false,
        enableEvidence: false,
        commitEvidence: false,
        defaultFastMode: false,
        approvalGateDefaults: {
          allowPrd: false,
          allowPlan: false,
          allowMerge: false,
          pushOnImplementationComplete: false,
        },
      },
    });

    const result = await getWorkflowDefaults();

    expect(result).toMatchObject({
      approvalGates: {
        allowPrd: false,
        allowPlan: false,
        allowMerge: false,
      },
      push: false,
      openPr: false,
    });
  });

  it('maps pushOnImplementationComplete to push field', async () => {
    mockLoadSettingsExecute.mockResolvedValue({
      workflow: {
        openPrOnImplementationComplete: false,
        ciWatchEnabled: false,
        enableEvidence: false,
        commitEvidence: false,
        defaultFastMode: false,
        approvalGateDefaults: {
          allowPrd: false,
          allowPlan: false,
          allowMerge: false,
          pushOnImplementationComplete: true,
        },
      },
    });

    const result = await getWorkflowDefaults();

    expect(result.push).toBe(true);
    expect(result.openPr).toBe(false);
  });

  it('maps openPrOnImplementationComplete to openPr field', async () => {
    mockLoadSettingsExecute.mockResolvedValue({
      workflow: {
        openPrOnImplementationComplete: true,
        ciWatchEnabled: false,
        enableEvidence: false,
        commitEvidence: false,
        defaultFastMode: false,
        approvalGateDefaults: {
          allowPrd: false,
          allowPlan: false,
          allowMerge: false,
          pushOnImplementationComplete: false,
        },
      },
    });

    const result = await getWorkflowDefaults();

    expect(result.push).toBe(false);
    expect(result.openPr).toBe(true);
  });
});
