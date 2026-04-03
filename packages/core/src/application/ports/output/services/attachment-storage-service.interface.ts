import type { Attachment } from '../../../../domain/generated/output.js';

/**
 * Port interface for file attachment storage.
 *
 * Handles storing, committing (pending → permanent), and deleting file attachments
 * associated with features. Implementations manage deduplication, path computation,
 * and filesystem operations.
 */
export interface IAttachmentStorageService {
  /**
   * Store a file buffer in a pending attachment directory.
   * Returns existing record if SHA-256 matches (dedup within same session).
   */
  store(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    sessionId: string
  ): Attachment & { sha256: string };

  /**
   * Commit pending uploads: move from pending directory to feature slug directory.
   * Returns the final attachment records with updated paths.
   */
  commit(sessionId: string, featureSlug: string): Attachment[];

  /**
   * Delete all attachments for a feature.
   */
  delete(featureSlug: string): void;
}
