/**
 * Port interface for tool installation metadata access.
 *
 * Tool metadata is loaded from JSON files at startup. This interface abstracts
 * the data access so that use cases and presentation layers don't need to import
 * the infrastructure module directly (which also avoids Turbopack bundling issues
 * with import.meta.url resolution).
 */
export interface ToolMetadata {
  name: string;
  summary: string;
  description: string;
  tags: ('ide' | 'cli-agent' | 'vcs' | 'terminal')[];
  author?: string;
  website?: string;
  platforms?: ('linux' | 'darwin' | 'win32')[];
  iconUrl?: string;
  binary: string | Record<string, string>;
  packageManager: string;
  commands: Record<string, string>;
  timeout: number;
  documentationUrl: string;
  verifyCommand: string;
  autoInstall?: boolean;
  required?: boolean;
  openDirectory?: string | Record<string, string>;
  spawnOptions?: {
    shell?: boolean;
    stdio?: 'ignore' | 'inherit' | 'pipe';
    detached?: boolean;
  };
  terminalCommand?: string | Record<string, string>;
}

export interface IToolMetadataService {
  /**
   * Get metadata for a specific tool by ID.
   */
  getToolMetadata(toolId: string): ToolMetadata | undefined;

  /**
   * Get all tool metadata as a record keyed by tool ID.
   */
  getAllToolMetadata(): Record<string, ToolMetadata>;

  /**
   * Get tools that can open a directory as an IDE (have `openDirectory` field).
   */
  getIdeEntries(): [string, ToolMetadata][];

  /**
   * Get terminal tools that can open a directory (tagged "terminal" with `openDirectory`).
   */
  getTerminalEntries(): [string, ToolMetadata][];
}
