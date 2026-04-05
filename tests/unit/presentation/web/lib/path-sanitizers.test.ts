// @vitest-environment node

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  realpathOrNull,
  isWithinRoot,
  realpathWithinAllowedRoots,
  realpathOrNullAsync,
  realpathWithinAllowedRootsAsync,
} from '@/lib/path-sanitizers';

describe('path-sanitizers', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'shipit-pathsan-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  describe('realpathOrNull', () => {
    it('returns the resolved path when the target exists', () => {
      const filePath = join(root, 'file.txt');
      writeFileSync(filePath, 'hi');
      const resolved = realpathOrNull(filePath);
      expect(resolved).not.toBeNull();
      // On macOS the real root may be /private/var/folders/... which differs
      // from the /var/folders/... returned by mkdtempSync. Both should end
      // with the file basename.
      expect(resolved!.endsWith('file.txt')).toBe(true);
    });

    it('returns null when the target does not exist', () => {
      expect(realpathOrNull(join(root, 'missing.txt'))).toBeNull();
    });

    it('resolves symlinks to their target', () => {
      const target = join(root, 'target.txt');
      writeFileSync(target, 'hi');
      const link = join(root, 'link.txt');
      symlinkSync(target, link);

      const resolved = realpathOrNull(link);
      expect(resolved).not.toBeNull();
      expect(resolved!.endsWith('target.txt')).toBe(true);
    });

    it('never throws — always returns null for missing paths', () => {
      // Use a path guaranteed not to exist rather than the empty string,
      // which Node's realpathSync resolves to the current working directory.
      const missing = join(root, 'definitely', 'does', 'not', 'exist');
      expect(() => realpathOrNull(missing)).not.toThrow();
      expect(realpathOrNull(missing)).toBeNull();
    });
  });

  describe('isWithinRoot', () => {
    it('returns true when candidate equals root', () => {
      expect(isWithinRoot('/Users/jason/.shipit-ai', '/Users/jason/.shipit-ai')).toBe(true);
    });

    it('returns true when candidate is a descendant of root', () => {
      expect(
        isWithinRoot('/Users/jason/.shipit-ai/repos/abc/file.png', '/Users/jason/.shipit-ai')
      ).toBe(true);
    });

    it('returns false for sibling directories with a shared name prefix', () => {
      // This is the classic off-by-one sibling-prefix bug that needs the
      // trailing separator in the startsWith check.
      expect(isWithinRoot('/Users/jason/.shipit-ai-evil', '/Users/jason/.shipit-ai')).toBe(false);
    });

    it('returns false when candidate is a parent of root', () => {
      expect(isWithinRoot('/Users/jason', '/Users/jason/.shipit-ai')).toBe(false);
    });

    it('normalizes Windows backslash separators before comparing', () => {
      expect(
        isWithinRoot('C:\\Users\\jason\\.shipit-ai\\repos\\file', 'C:\\Users\\jason\\.shipit-ai')
      ).toBe(true);
    });

    it('rejects sibling directories on Windows too', () => {
      expect(
        isWithinRoot('C:\\Users\\jason\\.shipit-ai-evil', 'C:\\Users\\jason\\.shipit-ai')
      ).toBe(false);
    });

    it('treats the empty candidate as not within any root', () => {
      expect(isWithinRoot('', '/some/root')).toBe(false);
    });
  });

  describe('realpathWithinAllowedRoots', () => {
    it('returns the resolved candidate when it lives under an allowed root', () => {
      const sub = join(root, 'subdir');
      mkdirSync(sub);
      const file = join(sub, 'file.txt');
      writeFileSync(file, 'hi');

      const resolved = realpathWithinAllowedRoots(file, [root]);
      expect(resolved).not.toBeNull();
      expect(resolved!.endsWith(join('subdir', 'file.txt'))).toBe(true);
    });

    it('accepts the root itself as a valid candidate', () => {
      expect(realpathWithinAllowedRoots(root, [root])).not.toBeNull();
    });

    it('returns null when candidate escapes every allowed root', () => {
      // Pass a real existing path that is NOT under `root`.
      expect(realpathWithinAllowedRoots(tmpdir(), [root])).toBeNull();
    });

    it('returns null when candidate cannot be resolved', () => {
      expect(realpathWithinAllowedRoots(join(root, 'missing'), [root])).toBeNull();
    });

    it('tries each allowed root in turn until one matches', () => {
      const other = mkdtempSync(join(tmpdir(), 'shipit-pathsan-other-'));
      try {
        const file = join(other, 'file.txt');
        writeFileSync(file, 'hi');
        // The file does not live under root, but it does live under other.
        expect(realpathWithinAllowedRoots(file, [root, other])).not.toBeNull();
      } finally {
        rmSync(other, { recursive: true, force: true });
      }
    });

    it('rejects symlink traversal that escapes the root', () => {
      // Create a symlink inside root that points outside root. realpath
      // resolves it to the outside target, and the containment check
      // should then reject it.
      const outside = mkdtempSync(join(tmpdir(), 'shipit-pathsan-outside-'));
      try {
        const outsideFile = join(outside, 'secret.txt');
        writeFileSync(outsideFile, 'secret');
        const link = join(root, 'escape.txt');
        symlinkSync(outsideFile, link);

        expect(realpathWithinAllowedRoots(link, [root])).toBeNull();
      } finally {
        rmSync(outside, { recursive: true, force: true });
      }
    });
  });

  describe('realpathOrNullAsync', () => {
    it('mirrors the sync variant for existing files', async () => {
      const file = join(root, 'file.txt');
      writeFileSync(file, 'hi');
      const resolved = await realpathOrNullAsync(file);
      expect(resolved).not.toBeNull();
      expect(resolved!.endsWith('file.txt')).toBe(true);
    });

    it('returns null for missing files without throwing', async () => {
      await expect(realpathOrNullAsync(join(root, 'missing'))).resolves.toBeNull();
    });
  });

  describe('realpathWithinAllowedRootsAsync', () => {
    it('accepts a valid candidate inside the allowed root', async () => {
      const file = join(root, 'file.txt');
      writeFileSync(file, 'hi');
      await expect(realpathWithinAllowedRootsAsync(file, [root])).resolves.not.toBeNull();
    });

    it('rejects a candidate outside every allowed root', async () => {
      await expect(realpathWithinAllowedRootsAsync(tmpdir(), [root])).resolves.toBeNull();
    });

    it('rejects symlink traversal that escapes the root', async () => {
      const outside = mkdtempSync(join(tmpdir(), 'shipit-pathsan-outside-async-'));
      try {
        const outsideFile = join(outside, 'secret.txt');
        writeFileSync(outsideFile, 'secret');
        const link = join(root, 'escape.txt');
        symlinkSync(outsideFile, link);

        await expect(realpathWithinAllowedRootsAsync(link, [root])).resolves.toBeNull();
      } finally {
        rmSync(outside, { recursive: true, force: true });
      }
    });

    it('resolves candidate and roots concurrently (not serially)', async () => {
      // This is a smoke test for the Promise.all fan-out, not a strict
      // timing assertion (which would be flaky). If the implementation
      // serialized instead of parallelized, the test still passes — but
      // the assertion below documents the intent.
      const file = join(root, 'file.txt');
      writeFileSync(file, 'hi');
      const result = await realpathWithinAllowedRootsAsync(file, [root, tmpdir()]);
      expect(result).not.toBeNull();
    });
  });
});
