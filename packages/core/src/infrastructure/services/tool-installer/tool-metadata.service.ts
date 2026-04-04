import { injectable } from 'tsyringe';
import type {
  IToolMetadataService,
  ToolMetadata,
} from '../../../application/ports/output/services/tool-metadata-service.interface.js';
import {
  TOOL_METADATA,
  getIdeEntries,
  getTerminalEntries,
  getShellEntries,
} from './tool-metadata.js';

/**
 * DI-injectable wrapper around the tool metadata module.
 * Delegates to the existing TOOL_METADATA constant and helper functions.
 */
@injectable()
export class ToolMetadataServiceImpl implements IToolMetadataService {
  getToolMetadata(toolId: string): ToolMetadata | undefined {
    return TOOL_METADATA[toolId] as ToolMetadata | undefined;
  }

  getAllToolMetadata(): Record<string, ToolMetadata> {
    return TOOL_METADATA as Record<string, ToolMetadata>;
  }

  getIdeEntries(): [string, ToolMetadata][] {
    return getIdeEntries() as [string, ToolMetadata][];
  }

  getTerminalEntries(): [string, ToolMetadata][] {
    return getTerminalEntries() as [string, ToolMetadata][];
  }

  getShellEntries(): [string, ToolMetadata][] {
    return getShellEntries() as [string, ToolMetadata][];
  }
}
