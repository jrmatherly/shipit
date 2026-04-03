import { injectable, inject } from 'tsyringe';
import type {
  PrCreateResult,
  IPrCreationService,
} from '../../../application/ports/output/services/git-pr-service.interface.js';
import type { ExecFunction } from './worktree.service.js';
import { parseGitError, parseGhError } from './git-error-utils.js';
import { readFileSync } from 'node:fs';
import yaml from 'js-yaml';
import { applyPrBranding } from './pr-branding.js';

@injectable()
export class PrCreationService implements IPrCreationService {
  constructor(@inject('ExecFunction') private readonly execFile: ExecFunction) {}

  async hasUncommittedChanges(cwd: string): Promise<boolean> {
    const { stdout } = await this.execFile('git', ['status', '--porcelain'], { cwd });
    return stdout.trim().length > 0;
  }

  async commitAll(cwd: string, message: string): Promise<string> {
    try {
      await this.execFile('git', ['add', '-A'], { cwd });
      await this.execFile('git', ['commit', '-m', message], { cwd });
      const { stdout } = await this.execFile('git', ['rev-parse', 'HEAD'], { cwd });
      return stdout.trim();
    } catch (error) {
      throw parseGitError(error);
    }
  }

  async push(cwd: string, branch: string, setUpstream?: boolean): Promise<void> {
    const args = ['push'];
    if (setUpstream) args.push('--set-upstream');
    args.push('origin', branch);

    try {
      await this.execFile('git', args, { cwd });
    } catch (error) {
      throw parseGitError(error);
    }
  }

  async createPr(cwd: string, prYamlPath: string): Promise<PrCreateResult> {
    try {
      // Parse pr.yaml to extract PR metadata
      const prYamlContent = readFileSync(prYamlPath, 'utf-8');
      const prData = yaml.load(prYamlContent) as {
        title?: string;
        body?: string;
        baseBranch?: string;
        headBranch?: string;
        labels?: string[];
        draft?: boolean;
      };

      const title = prData.title ?? 'Untitled PR';
      const body = applyPrBranding(prData.body ?? '');
      const args = ['pr', 'create', '--title', title, '--body', body];

      if (prData.baseBranch) {
        args.push('--base', prData.baseBranch);
      }
      if (prData.headBranch) {
        args.push('--head', prData.headBranch);
      }
      if (prData.labels?.length) {
        args.push('--label', prData.labels.join(','));
      }
      if (prData.draft) {
        args.push('--draft');
      }

      const { stdout } = await this.execFile('gh', args, { cwd });
      const url = stdout.trim();
      const number = this.parsePrNumberFromUrl(url);
      return { url, number };
    } catch (error) {
      throw parseGhError(error);
    }
  }

  async getPrHeadBranch(cwd: string, prNumber: number): Promise<string> {
    const { stdout } = await this.execFile(
      'gh',
      ['pr', 'view', String(prNumber), '--json', 'headRefName', '--jq', '.headRefName'],
      { cwd }
    );
    return stdout.trim();
  }

  parsePrNumberFromUrl(url: string): number {
    const match = url.match(/\/pull\/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }
}
