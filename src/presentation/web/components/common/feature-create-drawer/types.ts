export type { FileAttachment } from '@shipit-ai/core/infrastructure/services/file-dialog.service';

/** Attachment record for the create form — supports both picker and upload sources. */
export interface FormAttachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  path: string;
  loading?: boolean;
  /** Optional user notes or annotations for this image */
  notes?: string;
}

/** Minimal feature descriptor for the parent selector. */
export interface ParentFeatureOption {
  id: string;
  name: string;
}

/** Minimal repository descriptor for the repository selector. */
export interface RepositoryOption {
  id: string;
  name: string;
  path: string;
}

export interface FeatureCreatePayload {
  description: string;
  attachments: FormAttachment[];
  repositoryPath: string;
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
  parentId?: string;
  /** When true, skip SDLC phases and implement directly from the prompt. */
  fast: boolean;
  /** When true, create the feature in pending state (no agent spawned). */
  pending?: boolean;
  /** Fork repo and create PR to upstream at merge time. */
  forkAndPr: boolean;
  /** Commit specs/evidences into the repo (defaults false when forkAndPr is enabled). */
  commitSpecs: boolean;
  /** Sync main from remote before creating the feature branch (default: true). */
  rebaseBeforeBranch: boolean;
  /** Optional agent type override for this feature run */
  agentType?: string;
  /** Optional model override for this feature run */
  model?: string;
  /** Optional per-feature permission mode override (overrides agent default from settings) */
  permissionMode?: string;
  sessionId?: string;
}
