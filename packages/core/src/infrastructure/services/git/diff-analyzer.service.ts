import { injectable, inject } from 'tsyringe';
import type {
  DiffSummary,
  DiffHunk,
  DiffLine,
  FileDiff,
  IDiffAnalyzerService,
} from '../../../application/ports/output/services/git-pr-service.interface.js';
import type { ExecFunction } from './worktree.service.js';
import { parseGitError } from './git-error-utils.js';

@injectable()
export class DiffAnalyzerService implements IDiffAnalyzerService {
  constructor(@inject('ExecFunction') private readonly execFile: ExecFunction) {}

  async getPrDiffSummary(cwd: string, baseBranch: string): Promise<DiffSummary> {
    const { stdout: diffStat } = await this.execFile(
      'git',
      ['diff', '--stat', `${baseBranch}...HEAD`],
      { cwd }
    );
    const { stdout: logOutput } = await this.execFile(
      'git',
      ['log', '--oneline', `${baseBranch}...HEAD`],
      { cwd }
    );

    return this.parseDiffStat(diffStat, logOutput);
  }

  async getFileDiffs(cwd: string, baseBranch: string): Promise<FileDiff[]> {
    try {
      const { stdout } = await this.execFile(
        'git',
        ['diff', '--unified=3', `${baseBranch}...HEAD`],
        { cwd }
      );
      return this.parseUnifiedDiff(stdout);
    } catch (error) {
      throw parseGitError(error);
    }
  }

  parseUnifiedDiff(rawDiff: string): FileDiff[] {
    if (!rawDiff.trim()) return [];

    const files: FileDiff[] = [];
    // Split on "diff --git" boundaries (keeping the delimiter)
    const fileSections = rawDiff.split(/^(?=diff --git )/m).filter((s) => s.trim());

    for (const section of fileSections) {
      const file = this.parseFileDiff(section);
      if (file) files.push(file);
    }

    return files;
  }

  parseFileDiff(section: string): FileDiff | null {
    const lines = section.split('\n');
    if (lines.length === 0) return null;

    // Parse header: "diff --git a/path b/path"
    const headerMatch = lines[0].match(/^diff --git a\/(.+?) b\/(.+)$/);
    if (!headerMatch) return null;

    const oldPath = headerMatch[1];
    const newPath = headerMatch[2];

    // Determine status from diff header lines
    let status: FileDiff['status'] = 'modified';
    const isNew = lines.some((l) => l.startsWith('new file mode'));
    const isDeleted = lines.some((l) => l.startsWith('deleted file mode'));
    const isRenamed = lines.some((l) => l.startsWith('rename from'));

    if (isNew) status = 'added';
    else if (isDeleted) status = 'deleted';
    else if (isRenamed) status = 'renamed';

    // Parse hunks
    const hunks: DiffHunk[] = [];
    let currentHunk: DiffHunk | null = null;
    let oldLineNum = 0;
    let newLineNum = 0;
    let additions = 0;
    let deletions = 0;

    for (const line of lines) {
      const hunkHeaderMatch = line.match(/^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@(.*)$/);
      if (hunkHeaderMatch) {
        currentHunk = { header: line, lines: [] };
        hunks.push(currentHunk);
        oldLineNum = parseInt(hunkHeaderMatch[1], 10);
        newLineNum = parseInt(hunkHeaderMatch[2], 10);
        continue;
      }

      if (!currentHunk) continue;

      if (line.startsWith('+')) {
        const diffLine: DiffLine = {
          type: 'added',
          content: line.slice(1),
          newNumber: newLineNum,
        };
        currentHunk.lines.push(diffLine);
        newLineNum++;
        additions++;
      } else if (line.startsWith('-')) {
        const diffLine: DiffLine = {
          type: 'removed',
          content: line.slice(1),
          oldNumber: oldLineNum,
        };
        currentHunk.lines.push(diffLine);
        oldLineNum++;
        deletions++;
      } else if (line.startsWith(' ')) {
        const diffLine: DiffLine = {
          type: 'context',
          content: line.slice(1),
          oldNumber: oldLineNum,
          newNumber: newLineNum,
        };
        currentHunk.lines.push(diffLine);
        oldLineNum++;
        newLineNum++;
      }
      // Skip lines like "\ No newline at end of file"
    }

    return {
      path: newPath,
      oldPath: isRenamed || oldPath !== newPath ? oldPath : undefined,
      additions,
      deletions,
      status,
      hunks,
    };
  }

  parseDiffStat(diffStat: string, logOutput: string): DiffSummary {
    const summaryLine = diffStat.trim().split('\n').pop() ?? '';
    const filesMatch = summaryLine.match(/(\d+)\s+files?\s+changed/);
    const addMatch = summaryLine.match(/(\d+)\s+insertions?\(\+\)/);
    const delMatch = summaryLine.match(/(\d+)\s+deletions?\(-\)/);
    const commitCount = logOutput
      .trim()
      .split('\n')
      .filter((l) => l.trim()).length;

    return {
      filesChanged: filesMatch ? parseInt(filesMatch[1], 10) : 0,
      additions: addMatch ? parseInt(addMatch[1], 10) : 0,
      deletions: delMatch ? parseInt(delMatch[1], 10) : 0,
      commitCount,
    };
  }
}
