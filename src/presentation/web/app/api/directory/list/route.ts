import { NextResponse } from 'next/server';
import { readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { apiError } from '@/lib/api-helpers';
import { realpathWithinAllowedRootsAsync } from '@/lib/path-sanitizers';

interface DirectoryEntry {
  name: string;
  path: string;
  isDirectory: true;
  updatedAt: string;
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const rawPath = url.searchParams.get('path') ?? homedir();
  const showHidden = url.searchParams.get('showHidden') === 'true';

  if (!path.isAbsolute(rawPath)) {
    return NextResponse.json({ error: 'Path must be absolute' }, { status: 400 });
  }

  // Keep two names for the same directory:
  //
  //   - `displayPath` is what the client originally asked for (after
  //     path.resolve normalization). It's what the UI shows in the
  //     breadcrumb and what we echo back as `currentPath`. This matches
  //     user expectation — e.g. on macOS the user sees /tmp/foo, not the
  //     realpath'd /private/tmp/foo.
  //
  //   - `physicalPath` is the realpath'd absolute path produced by the
  //     path-containment sanitizer. Every FILESYSTEM operation (stat,
  //     readdir, per-entry joins) uses this value, NEVER the display
  //     path. That gives CodeQL a clean sanitizer→sink flow for
  //     js/path-injection and closes the TOCTOU window where a symlink
  //     could be swapped between the containment check and the read.
  const displayPath = path.resolve(rawPath);
  const physicalPath = await realpathWithinAllowedRootsAsync(displayPath, [
    process.cwd(),
    homedir(),
  ]);
  if (!physicalPath) {
    // Could be a missing directory OR a path outside the allowed roots.
    // Return a uniform 404 either way so we don't leak existence of
    // arbitrary paths on the host.
    return NextResponse.json({ error: 'Directory not found' }, { status: 404 });
  }

  try {
    const dirStat = await stat(physicalPath);
    if (!dirStat.isDirectory()) {
      return NextResponse.json({ error: 'Path is not a directory' }, { status: 400 });
    }
  } catch (error: unknown) {
    if (isErrnoException(error) && error.code === 'ENOENT') {
      return NextResponse.json({ error: 'Directory not found' }, { status: 404 });
    }
    return apiError(500, 'Failed to access directory', error);
  }

  try {
    const dirents = await readdir(physicalPath, { withFileTypes: true });

    const entries: DirectoryEntry[] = [];

    const entryPromises = dirents.map(async (dirent) => {
      if (!showHidden && dirent.name.startsWith('.')) {
        return null;
      }

      // Build two path forms per entry: a physical path for stat() and a
      // display path for the response payload. The client navigates using
      // the display path on subsequent requests, so it must match the
      // user-visible form of the parent directory — never the realpath'd
      // form, which would surprise the user with /private/tmp on macOS.
      const physicalEntry = path.join(physicalPath, dirent.name);
      const displayEntry = path.join(displayPath, dirent.name);

      try {
        if (dirent.isDirectory()) {
          const entryStat = await stat(physicalEntry);
          return {
            name: dirent.name,
            path: displayEntry,
            isDirectory: true as const,
            updatedAt: entryStat.mtime.toISOString(),
          };
        }

        if (dirent.isSymbolicLink()) {
          const entryStat = await stat(physicalEntry);
          if (entryStat.isDirectory()) {
            return {
              name: dirent.name,
              path: displayEntry,
              isDirectory: true as const,
              updatedAt: entryStat.mtime.toISOString(),
            };
          }
        }
      } catch {
        // Skip inaccessible entries (permission denied, broken symlinks)
      }

      return null;
    });

    const results = await Promise.all(entryPromises);
    for (const result of results) {
      if (result !== null) {
        entries.push(result);
      }
    }

    return NextResponse.json({ entries, currentPath: displayPath });
  } catch (error: unknown) {
    return apiError(500, 'Failed to read directory', error);
  }
}

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
