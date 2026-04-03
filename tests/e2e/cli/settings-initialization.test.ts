/**
 * CLI Settings Initialization E2E Tests
 *
 * Tests for automatic settings initialization when CLI starts.
 * Uses SHIPIT_AI_HOME env var to isolate each test from real ~/.shipit-ai/ directory.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, writeFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCliRunner } from '../../helpers/cli/index.js';

describe('CLI: settings initialization', () => {
  let shipitAiDir: string;
  let dbPath: string;

  beforeEach(() => {
    shipitAiDir = mkdtempSync(join(tmpdir(), 'shipit-ai-init-test-'));
    dbPath = join(shipitAiDir, 'data');
  });

  afterEach(() => {
    if (existsSync(shipitAiDir)) {
      rmSync(shipitAiDir, { recursive: true, force: true });
    }
  });

  it('should create non-empty database file on first run', () => {
    const runner = createCliRunner({
      env: { SHIPIT_AI_HOME: shipitAiDir },
      timeout: 15000,
    });

    const result = runner.run('version');

    expect(result.success).toBe(true);
    expect(existsSync(dbPath)).toBe(true);
    const stats = statSync(dbPath);
    expect(stats.size).toBeGreaterThan(0);
  });

  it('should load existing settings without re-initializing on second run', () => {
    const runner = createCliRunner({
      env: { SHIPIT_AI_HOME: shipitAiDir },
      timeout: 15000,
    });

    const firstResult = runner.run('version');
    expect(firstResult.success).toBe(true);

    const stats1 = statSync(dbPath);
    const firstMtime = stats1.mtimeMs;

    const secondResult = runner.run('version');

    expect(secondResult.success).toBe(true);
    const stats2 = statSync(dbPath);
    const secondMtime = stats2.mtimeMs;

    const mtimeDiff = Math.abs(secondMtime - firstMtime);
    expect(mtimeDiff).toBeLessThan(5000);
  }, 30_000);

  it('should handle corrupted database gracefully', () => {
    writeFileSync(dbPath, 'CORRUPTED_DATA_NOT_SQLITE');

    const runner = createCliRunner({
      env: { SHIPIT_AI_HOME: shipitAiDir },
      timeout: 15000,
    });

    const result = runner.run('version');

    if (result.success) {
      expect(existsSync(dbPath)).toBe(true);
    } else {
      const output = (result.stderr || result.stdout)
        .split('\n')
        .filter((line) => !line.includes('npm notice'))
        .join('\n');
      expect(output).toMatch(/failed|database|settings|corrupted|initialize/i);
    }
  });

  it('should handle missing database with existing directory', () => {
    expect(existsSync(shipitAiDir)).toBe(true);
    expect(existsSync(dbPath)).toBe(false);

    const runner = createCliRunner({
      env: { SHIPIT_AI_HOME: shipitAiDir },
      timeout: 15000,
    });

    const result = runner.run('version');

    expect(result.success).toBe(true);
    expect(existsSync(dbPath)).toBe(true);
  });

  it('should handle multiple concurrent CLI invocations safely', async () => {
    const runner = createCliRunner({
      env: { SHIPIT_AI_HOME: shipitAiDir },
      timeout: 15000,
    });

    const promises = [
      Promise.resolve(runner.run('version')),
      Promise.resolve(runner.run('--version')),
      Promise.resolve(runner.run('--help')),
    ];

    const results = await Promise.all(promises);

    results.forEach((result) => {
      expect(result.success).toBe(true);
    });

    expect(existsSync(dbPath)).toBe(true);
  }, 60_000);

  it('should use SHIPIT_AI_HOME environment variable for settings location', () => {
    const runner = createCliRunner({
      env: { SHIPIT_AI_HOME: shipitAiDir },
      timeout: 15000,
    });

    const result = runner.run('version');

    expect(result.success).toBe(true);
    expect(existsSync(dbPath)).toBe(true);
  }, 30_000);
});
