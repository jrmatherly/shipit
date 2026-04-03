import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TooltipProvider } from '@/components/ui/tooltip';
import { WorkflowOptionsSection } from './workflow-options-section';

const meta: Meta<typeof WorkflowOptionsSection> = {
  title: 'Drawers/Feature/WorkflowOptionsSection',
  component: WorkflowOptionsSection,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <TooltipProvider delayDuration={400}>
        <div className="w-[448px] p-4">
          <Story />
        </div>
      </TooltipProvider>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
  args: {
    approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
    onApprovalGatesChange: fn(),
    enableEvidence: false,
    onEnableEvidenceChange: fn(),
    commitEvidence: false,
    onCommitEvidenceChange: fn(),
    push: false,
    onPushChange: fn(),
    openPr: false,
    onOpenPrChange: fn(),
    ciWatchEnabled: true,
    onCiWatchChange: fn(),
    rebaseBeforeBranch: true,
    onRebaseBeforeBranchChange: fn(),
    commitSpecs: true,
    onCommitSpecsChange: fn(),
    forkAndPr: false,
    onForkAndPrChange: fn(),
    canPush: false,
    fast: true,
    computedPush: false,
    computedOpenPr: false,
    isSubmitting: false,
  },
};

export default meta;
type Story = StoryObj<typeof WorkflowOptionsSection>;

/** Default state — all toggles off except CI Watch and Rebase. */
export const Default: Story = {};

/** All approval gates enabled. */
export const AllApprovalGates: Story = {
  args: {
    approvalGates: { allowPrd: true, allowPlan: true, allowMerge: true },
  },
};

/** Fast mode — PRD and Plan approval gates are disabled (skipped in fast mode). */
export const FastModeActive: Story = {
  args: {
    fast: true,
    approvalGates: { allowPrd: true, allowPlan: true, allowMerge: true },
  },
};

/** Evidence collection enabled. */
export const EvidenceEnabled: Story = {
  args: {
    enableEvidence: true,
    openPr: true,
    computedOpenPr: true,
  },
};

/** Evidence collection + commit to PR both enabled. */
export const EvidenceWithCommit: Story = {
  args: {
    enableEvidence: true,
    commitEvidence: true,
    openPr: true,
    computedOpenPr: true,
  },
};

/** Push enabled. */
export const PushEnabled: Story = {
  args: {
    push: true,
    computedPush: true,
  },
};

/** PR enabled — push + open PR both active. */
export const PrEnabled: Story = {
  args: {
    push: true,
    openPr: true,
    computedPush: true,
    computedOpenPr: true,
  },
};

/** Fork & PR mode — user does not have push access, fork toggle is visible and active. */
export const ForkAndPrActive: Story = {
  args: {
    forkAndPr: true,
    canPush: false,
    computedPush: true,
    computedOpenPr: true,
    commitSpecs: false,
  },
};

/** User has push access — Fork & PR toggle is hidden. */
export const CanPushDirectly: Story = {
  args: {
    canPush: true,
  },
};

/** Submitting state — all toggles disabled. */
export const Submitting: Story = {
  args: {
    isSubmitting: true,
    approvalGates: { allowPrd: true, allowPlan: false, allowMerge: true },
    enableEvidence: true,
    push: true,
    computedPush: true,
  },
};

/** Sync disabled — rebase before branch toggle is off. */
export const SyncDisabled: Story = {
  args: {
    rebaseBeforeBranch: false,
  },
};
