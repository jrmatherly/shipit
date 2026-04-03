export interface GitLogEntry {
  hash: string;
  shortHash: string;
  subject: string;
  author: string;
  relativeDate: string;
  branch?: string;
}

export interface GitBranchInfo {
  name: string;
  isCurrent: boolean;
  lastCommitDate: string;
}

export interface GitRemoteInfo {
  name: string;
  url: string;
}

export interface GitWorkingTreeStatus {
  staged: number;
  modified: number;
  untracked: number;
}

export interface GitDiffStats {
  filesChanged: number;
  insertions: number;
  deletions: number;
}

export interface GitRepoInfo {
  commits: GitLogEntry[];
  branches: GitBranchInfo[];
  remotes: GitRemoteInfo[];
  tags: string[];
  stashCount: number;
  currentBranch: string;
  diffStats: GitDiffStats | null;
  workingTree: GitWorkingTreeStatus;
  error?: string;
}

export async function getGitRepoInfo(
  _repositoryPath: string,
  _commitLimit = 8
): Promise<GitRepoInfo> {
  return {
    commits: [
      {
        hash: 'abc123def456',
        shortHash: 'abc123d',
        subject: 'feat: add authentication module',
        author: 'Jane Dev',
        relativeDate: '2 hours ago',
        branch: 'feature/auth',
      },
      {
        hash: 'def456abc789',
        shortHash: 'def456a',
        subject: 'fix: resolve login redirect issue',
        author: 'John Dev',
        relativeDate: '1 day ago',
      },
      {
        hash: '789abc012def',
        shortHash: '789abc0',
        subject: 'chore: update dependencies',
        author: 'Jane Dev',
        relativeDate: '3 days ago',
      },
    ],
    branches: [
      { name: 'main', isCurrent: false, lastCommitDate: '3 days ago' },
      { name: 'feature/auth', isCurrent: true, lastCommitDate: '2 hours ago' },
      { name: 'develop', isCurrent: false, lastCommitDate: '1 day ago' },
    ],
    remotes: [{ name: 'origin', url: 'https://github.com/acme/my-repo.git' }],
    tags: ['v1.0.0', 'v0.9.0'],
    stashCount: 1,
    currentBranch: 'feature/auth',
    diffStats: { filesChanged: 3, insertions: 45, deletions: 12 },
    workingTree: { staged: 1, modified: 2, untracked: 0 },
  };
}
