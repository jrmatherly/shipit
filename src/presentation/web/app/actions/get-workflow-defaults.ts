'use server';

import { resolve } from '@/lib/server-container';
import type { LoadSettingsUseCase } from '@shipit-ai/core/application/use-cases/settings/load-settings.use-case';

export interface WorkflowDefaults {
  approvalGates: {
    allowPrd: boolean;
    allowPlan: boolean;
    allowMerge: boolean;
  };
  push: boolean;
  openPr: boolean;
  ciWatchEnabled: boolean;
  enableEvidence: boolean;
  commitEvidence: boolean;
  fast: boolean;
}

export async function getWorkflowDefaults(): Promise<WorkflowDefaults> {
  const loadSettings = resolve<LoadSettingsUseCase>('LoadSettingsUseCase');
  const settings = await loadSettings.execute();
  const { workflow } = settings;

  return {
    approvalGates: {
      allowPrd: workflow.approvalGateDefaults.allowPrd,
      allowPlan: workflow.approvalGateDefaults.allowPlan,
      allowMerge: workflow.approvalGateDefaults.allowMerge,
    },
    push: workflow.approvalGateDefaults.pushOnImplementationComplete,
    openPr: workflow.openPrOnImplementationComplete,
    ciWatchEnabled: workflow.ciWatchEnabled,
    enableEvidence: workflow.enableEvidence,
    commitEvidence: workflow.commitEvidence,
    fast: workflow.defaultFastMode,
  };
}
