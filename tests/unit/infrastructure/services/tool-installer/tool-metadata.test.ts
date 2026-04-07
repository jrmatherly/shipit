// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  TOOL_METADATA,
  type ToolMetadata,
} from '@/infrastructure/services/tool-installer/tool-metadata';

// Verified-OK SimpleIcons slugs as of last audit. When SimpleIcons removes a
// brand (as they did with all Microsoft icons and OpenAI), update this list
// AND switch the affected tool's iconUrl to a local SVG in
// src/presentation/web/public/icons/tools/.
//
// Re-audit by running:
//   for slug in alacritty atlassian claude git github ... ; do
//     curl -s -o /dev/null -w "%{http_code}" "https://cdn.simpleicons.org/$slug"
//   done
const VERIFIED_SIMPLEICONS_SLUGS = new Set([
  'alacritty',
  'atlassian',
  'claude',
  'git',
  'github',
  'githubcopilot',
  'googlegemini',
  'iterm2',
  'tmux',
  'warp',
  'windsurf',
  'zedindustries',
]);

const PUBLIC_ICONS_DIR = join(__dirname, '../../../../../src/presentation/web/public');

describe('ToolMetadata', () => {
  describe('TOOL_METADATA loading', () => {
    it('loads all IDE tools (those with openDirectory)', () => {
      const ideTools = Object.entries(TOOL_METADATA).filter(
        ([, meta]) => meta.openDirectory != null
      );
      expect(ideTools.length).toBeGreaterThanOrEqual(5);

      const ideKeys = ideTools.map(([key]) => key);
      expect(ideKeys).toContain('vscode');
      expect(ideKeys).toContain('cursor');
      expect(ideKeys).toContain('windsurf');
      expect(ideKeys).toContain('zed');
      expect(ideKeys).toContain('antigravity');
    });
  });

  describe('openDirectory {dir} placeholder', () => {
    it.each(['vscode', 'cursor', 'windsurf', 'zed'])(
      '%s has {dir} in openDirectory string',
      (editorId) => {
        const meta = TOOL_METADATA[editorId];
        expect(meta).toBeDefined();
        expect(typeof meta.openDirectory).toBe('string');
        expect(meta.openDirectory).toContain('{dir}');
      }
    );

    it('antigravity has per-platform openDirectory object with {dir}', () => {
      const meta = TOOL_METADATA['antigravity'];
      expect(meta).toBeDefined();
      expect(typeof meta.openDirectory).toBe('object');

      const openDir = meta.openDirectory as Record<string, string>;
      expect(openDir).toHaveProperty('linux');
      expect(openDir).toHaveProperty('darwin');
      expect(openDir['linux']).toContain('{dir}');
      expect(openDir['darwin']).toContain('{dir}');
      expect(openDir['linux']).toContain('antigravity');
      expect(openDir['darwin']).toContain('agy');
    });

    it('no IDE tool uses "." as directory placeholder', () => {
      const ideTools = Object.entries(TOOL_METADATA).filter(
        ([, meta]) => meta.openDirectory != null
      );

      for (const [key, meta] of ideTools) {
        if (typeof meta.openDirectory === 'string') {
          expect(meta.openDirectory, `${key} should not use "." placeholder`).not.toMatch(/\s\.$/);
        } else if (typeof meta.openDirectory === 'object') {
          for (const [platform, cmd] of Object.entries(
            meta.openDirectory as Record<string, string>
          )) {
            expect(cmd, `${key}.${platform} should not use "." placeholder`).not.toMatch(/\s\.$/);
          }
        }
      }
    });
  });

  describe('openDirectory type support', () => {
    it('accepts string format for openDirectory', () => {
      const meta: ToolMetadata = {
        name: 'Test IDE',
        summary: 'test',
        description: 'test',
        tags: ['ide'],
        binary: 'test',
        packageManager: 'manual',
        commands: { linux: 'echo test' },
        timeout: 30000,
        documentationUrl: 'https://example.com',
        verifyCommand: 'test --version',
        openDirectory: 'test {dir}',
      };
      expect(meta.openDirectory).toBe('test {dir}');
    });

    it('accepts Record<string, string> format for openDirectory', () => {
      const meta: ToolMetadata = {
        name: 'Test IDE',
        summary: 'test',
        description: 'test',
        tags: ['ide'],
        binary: 'test',
        packageManager: 'manual',
        commands: { linux: 'echo test' },
        timeout: 30000,
        documentationUrl: 'https://example.com',
        verifyCommand: 'test --version',
        openDirectory: {
          linux: 'test-linux {dir}',
          darwin: 'test-mac {dir}',
        },
      };
      expect(typeof meta.openDirectory).toBe('object');
      expect((meta.openDirectory as Record<string, string>)['linux']).toBe('test-linux {dir}');
    });
  });

  /**
   * Icon URL validation: catches the class of bug where a SimpleIcons CDN URL
   * silently 404s in production (e.g. cdn.simpleicons.org/openai was removed
   * after the original tool definition was written). Every iconUrl must be
   * one of:
   *
   *   1. A local file path under public/icons/tools/ (must exist on disk)
   *   2. A SimpleIcons CDN URL with a slug in VERIFIED_SIMPLEICONS_SLUGS
   *   3. A jsdelivr/raw.githubusercontent/devicon CDN URL (allowed escape hatch)
   *
   * When SimpleIcons removes a brand, the fix is to add a local SVG in
   * public/icons/tools/ and switch the iconUrl to that path.
   */
  describe('iconUrl validation', () => {
    const toolsWithIcons = Object.entries(TOOL_METADATA).filter(([, meta]) => meta.iconUrl != null);

    it('every tool with iconUrl uses an allowed source', () => {
      const failures: string[] = [];

      for (const [toolId, meta] of toolsWithIcons) {
        const url = meta.iconUrl;
        if (typeof url !== 'string') {
          failures.push(`${toolId}: iconUrl is not a string`);
          continue;
        }

        // Local file path: must exist on disk
        if (url.startsWith('/icons/tools/')) {
          const fullPath = join(PUBLIC_ICONS_DIR, url);
          if (!existsSync(fullPath)) {
            failures.push(`${toolId}: local icon ${url} not found at ${fullPath}`);
          }
          continue;
        }

        // SimpleIcons CDN: slug must be in verified list
        const simpleIconMatch = url.match(/^https:\/\/cdn\.simpleicons\.org\/([\w-]+)$/);
        if (simpleIconMatch) {
          const slug = simpleIconMatch[1];
          if (!VERIFIED_SIMPLEICONS_SLUGS.has(slug)) {
            failures.push(
              `${toolId}: SimpleIcons slug '${slug}' is not in VERIFIED_SIMPLEICONS_SLUGS. ` +
                `Either add it to the verified list (after curl-checking it returns 200) ` +
                `or replace with a local SVG at /icons/tools/${slug}.svg.`
            );
          }
          continue;
        }

        // Other allowed CDN escape hatches
        if (
          url.startsWith('https://cdn.jsdelivr.net/') ||
          url.startsWith('https://raw.githubusercontent.com/')
        ) {
          continue;
        }

        failures.push(
          `${toolId}: iconUrl '${url}' is not a recognized format ` +
            `(expected /icons/tools/*.svg, cdn.simpleicons.org/<slug>, or jsdelivr/raw.githubusercontent)`
        );
      }

      expect(failures, failures.join('\n')).toEqual([]);
    });

    it('codex-cli uses local openai.svg (regression test for SimpleIcons removal)', () => {
      const codex = TOOL_METADATA['codex-cli'];
      expect(codex).toBeDefined();
      expect(codex.iconUrl).toBe('/icons/tools/openai.svg');

      const fullPath = join(PUBLIC_ICONS_DIR, '/icons/tools/openai.svg');
      expect(existsSync(fullPath)).toBe(true);
    });
  });
});
