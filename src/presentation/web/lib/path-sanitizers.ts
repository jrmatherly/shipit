/**
 * Path sanitization helpers for the web presentation layer.
 *
 * Provides the small set of primitives used by every route and server
 * action that touches a user-influenced filesystem path. Each helper
 * does one thing, is recognized by CodeQL's js/path-injection taint
 * analysis as a sanitizer, and is portable across macOS/Linux/Windows.
 *
 * Design principles:
 *
 *   - `realpathOrNull(p)` resolves a path through `realpath` and returns
 *     `null` on any error (missing file, permission denied, broken symlink).
 *     Callers never have to care about the thrown error variants.
 *
 *   - `isWithinRoot(candidate, root)` is a pure string containment check
 *     that expects both arguments to already be realpath-resolved. It
 *     normalizes backslash separators to forward slashes before comparing,
 *     so Windows realpath output matches the forward-slash roots that
 *     shipit uses throughout the codebase for persistence and comparison.
 *
 *   - `realpathWithinAllowedRoots(candidate, roots)` combines the two:
 *     resolves the candidate once, resolves each root once (with graceful
 *     fallback to the unresolved form for the roots), then checks
 *     containment. Returns the resolved candidate on success, `null` on
 *     failure. Use this when a value must live under one of several
 *     permitted directories (e.g. cwd OR home-dir for the uploads API).
 *
 * These helpers intentionally do NOT compose realpath with the
 * containment check into a single `realpathWithinRoot(candidate, root)`
 * function, because that composition re-resolves an already-resolved
 * root on every nested call and opens a TOCTOU window where filesystem
 * state can change between the resolve and the containment check. Keep
 * realpath and containment separate so the caller can resolve once and
 * validate many.
 */
import { realpathSync } from 'node:fs';
import { realpath } from 'node:fs/promises';

/**
 * Resolve a path through `realpath` and return the resolved absolute path,
 * or `null` if the path is missing, unreadable, or cannot be canonicalized
 * for any other reason. Never throws.
 *
 * CodeQL recognizes `realpathSync` output as a sanitizer for
 * `js/path-injection`, so the returned value is safe to flow into `stat`,
 * `readFile`, `readdir`, `spawn`, and other filesystem sinks.
 */
export function realpathOrNull(p: string): string | null {
  try {
    return realpathSync(p);
  } catch {
    return null;
  }
}

/**
 * Pure string containment check: does `resolvedCandidate` live at or
 * beneath `resolvedRoot`? BOTH arguments are expected to already be
 * realpath-resolved absolute paths — this helper does NOT resolve them.
 * Separate the resolve step from the containment check so the caller can
 * resolve once and validate many times without redundant syscalls or
 * TOCTOU windows.
 *
 * Uses forward-slash normalization on both sides before comparing, which
 * is lossless on POSIX (separator is already `/`) and lossless on Windows
 * (where `/` cannot appear inside a path component). This makes the
 * helper safe to use across all three platforms.
 */
export function isWithinRoot(resolvedCandidate: string, resolvedRoot: string): boolean {
  const normRoot = resolvedRoot.replace(/\\/g, '/');
  const normCandidate = resolvedCandidate.replace(/\\/g, '/');
  return normCandidate === normRoot || normCandidate.startsWith(`${normRoot}/`);
}

/**
 * Resolve `candidate` through realpath and assert the result lives under
 * at least one of the provided `allowedRoots`. Returns the resolved
 * candidate path on success, or `null` if the candidate cannot be resolved
 * or does not fall under any allowed root.
 *
 * The roots are resolved once, up-front, with graceful fallback to the
 * unresolved form on failure (so a root that does not yet exist on disk
 * is still honored as a literal prefix — this matches the existing
 * behavior of the upload and directory-list routes). If the caller wants
 * strict resolution of the roots too, pre-resolve them with
 * `realpathOrNull` and filter out `null`s before calling this helper.
 */
export function realpathWithinAllowedRoots(
  candidate: string,
  allowedRoots: readonly string[]
): string | null {
  const resolvedCandidate = realpathOrNull(candidate);
  if (!resolvedCandidate) return null;

  for (const root of allowedRoots) {
    const resolvedRoot = realpathOrNull(root) ?? root;
    if (isWithinRoot(resolvedCandidate, resolvedRoot)) {
      return resolvedCandidate;
    }
  }
  return null;
}

// ─── Async variants ─────────────────────────────────────────────────────
//
// Route handlers that already use async fs APIs should use these rather
// than the sync variants so they don't block the event loop under
// concurrent load. The async helpers mirror the sync ones exactly in
// semantics — same null-on-error contract, same normalization, same
// containment rules.

/**
 * Async variant of `realpathOrNull`. See the sync version for semantics.
 */
export async function realpathOrNullAsync(p: string): Promise<string | null> {
  try {
    return await realpath(p);
  } catch {
    return null;
  }
}

/**
 * Async variant of `realpathWithinAllowedRoots`. See the sync version for
 * semantics. Resolves the candidate and each root concurrently via
 * `Promise.all` so the worst-case wall-clock time is a single realpath,
 * not N of them serialized.
 */
export async function realpathWithinAllowedRootsAsync(
  candidate: string,
  allowedRoots: readonly string[]
): Promise<string | null> {
  const [resolvedCandidate, ...resolvedRoots] = await Promise.all([
    realpathOrNullAsync(candidate),
    ...allowedRoots.map((r) => realpathOrNullAsync(r)),
  ]);
  if (!resolvedCandidate) return null;

  for (let i = 0; i < resolvedRoots.length; i++) {
    const resolvedRoot = resolvedRoots[i] ?? allowedRoots[i];
    if (isWithinRoot(resolvedCandidate, resolvedRoot)) {
      return resolvedCandidate;
    }
  }
  return null;
}
