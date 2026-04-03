import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { getDaemonStatePath } from '@/infrastructure/services/filesystem/shipit-ai-directory.service.js';

describe('getDaemonStatePath', () => {
  let originalShipitAiHome: string | undefined;

  beforeEach(() => {
    originalShipitAiHome = process.env.SHIPIT_AI_HOME;
  });

  afterEach(() => {
    if (originalShipitAiHome === undefined) {
      delete process.env.SHIPIT_AI_HOME;
    } else {
      process.env.SHIPIT_AI_HOME = originalShipitAiHome;
    }
  });

  it('returns ~/.shipit-ai/daemon.json when SHIPIT_AI_HOME is not set', () => {
    delete process.env.SHIPIT_AI_HOME;
    const expected = join(homedir(), '.shipit-ai', 'daemon.json');
    expect(getDaemonStatePath()).toBe(expected);
  });

  it('returns SHIPIT_AI_HOME/daemon.json when SHIPIT_AI_HOME is set', () => {
    process.env.SHIPIT_AI_HOME = '/tmp/test-shipit-ai-home';
    expect(getDaemonStatePath()).toBe(join('/tmp/test-shipit-ai-home', 'daemon.json'));
  });
});
