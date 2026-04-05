/**
 * Onboarding Wizard Types
 *
 * Contracts between wizard steps and the orchestrator.
 */

import type { AgentConfigResult } from '../agent-config.wizard.js';

/**
 * Result from the workflow defaults step (checkbox prompt).
 */
export interface WorkflowDefaultsResult {
  allowPrd: boolean;
  allowPlan: boolean;
  allowMerge: boolean;
  pushOnImplementationComplete: boolean;
  openPrOnImplementationComplete: boolean;
}

/**
 * Combined result from all onboarding wizard steps.
 */
export interface OnboardingResult {
  agent: AgentConfigResult;
  /** Permission mode selected for the agent, or undefined if skipped */
  permissionMode?: string;
  ide: string;
  workflowDefaults: WorkflowDefaultsResult;
}
