/**
 * Presentation-layer adapter for core infrastructure utilities.
 *
 * Re-exports pure utility functions and constants so that presentation code
 * (web actions, API routes) does not import directly from infrastructure,
 * preserving Clean Architecture boundaries.
 *
 * Type-only imports from infrastructure remain acceptable in presentation code
 * and do not need to go through this module.
 */

export { isProcessAlive } from '@shipit-ai/core/infrastructure/services/process/is-process-alive';
export { computeWorktreePath } from '@shipit-ai/core/infrastructure/services/ide-launchers/compute-worktree-path';
export { getShipitAiHomeDir } from '@shipit-ai/core/infrastructure/services/filesystem/shipit-ai-directory.service';
export { createDeploymentLogger } from '@shipit-ai/core/infrastructure/services/deployment/deployment-logger';
export { IS_WINDOWS } from '@shipit-ai/core/infrastructure/platform';
export { FolderDialogService } from '@shipit-ai/core/infrastructure/services/folder-dialog.service';
export { FileDialogService } from '@shipit-ai/core/infrastructure/services/file-dialog.service';
