import { NextResponse } from 'next/server';
import { readFile, realpath } from 'fs/promises';
import { extname, basename, resolve as resolvePath, sep } from 'path';
import { homedir } from 'node:os';
import { resolve } from '@/lib/server-container';
import type { AttachmentStorageService } from '@shipit-ai/core/infrastructure/services/attachment-storage.service';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.bmp',
  '.ico',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.md',
  '.csv',
  '.json',
  '.yaml',
  '.yml',
  '.xml',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.py',
  '.rb',
  '.go',
  '.rs',
  '.java',
  '.c',
  '.cpp',
  '.h',
  '.hpp',
  '.cs',
  '.swift',
  '.kt',
  '.html',
  '.css',
  '.scss',
  '.less',
  '.sh',
  '.bash',
  '.zsh',
  '.fish',
  '.toml',
  '.ini',
  '.cfg',
  '.conf',
  '.zip',
  '.tar',
  '.gz',
  '.log',
]);

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.json': 'application/json',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',
};

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { path, sessionId } = body as { path?: string; sessionId?: string };

    if (!path || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields: path, sessionId' },
        { status: 400 }
      );
    }

    const ext = extname(path).toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        {
          error: ext
            ? `File type "${ext}" is not allowed`
            : 'Files without an extension are not allowed',
        },
        { status: 400 }
      );
    }

    // Path containment: resolve symlinks then verify within allowed roots.
    // `physicalPath` is the single authoritative value — every subsequent
    // filesystem call uses it, never the raw `path` input. This eliminates
    // the TOCTOU window between check and use AND gives CodeQL a clean
    // sanitizer→sink flow for js/path-injection.
    let physicalPath: string;
    try {
      physicalPath = await realpath(resolvePath(path));
    } catch {
      return NextResponse.json({ error: 'File not found or unreadable' }, { status: 404 });
    }
    const allowedRoots = [
      await realpath(process.cwd()).catch(() => process.cwd()),
      await realpath(homedir()).catch(() => homedir()),
    ];
    const isAllowed = allowedRoots.some(
      (root) => physicalPath === root || physicalPath.startsWith(root + sep)
    );
    if (!isAllowed) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    let buffer: Buffer;
    try {
      // Read using the validated physicalPath, NOT a re-resolution of `path`.
      // This closes the TOCTOU gap where a symlink could be swapped between
      // the containment check and the read.
      buffer = await readFile(physicalPath);
    } catch {
      return NextResponse.json({ error: 'File not found or unreadable' }, { status: 404 });
    }

    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File exceeds 10 MB limit (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`,
        },
        { status: 413 }
      );
    }

    const filename = basename(path);
    const mimeType = MIME_MAP[ext] ?? 'application/octet-stream';

    const service = resolve<AttachmentStorageService>('AttachmentStorageService');
    const attachment = service.store(buffer, filename, mimeType, sessionId);

    return NextResponse.json({
      id: attachment.id,
      name: attachment.name,
      size: Number(attachment.size),
      mimeType: attachment.mimeType,
      path: attachment.path,
      createdAt: attachment.createdAt,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
