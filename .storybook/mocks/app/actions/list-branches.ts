export async function listBranches(_repositoryPath: string): Promise<string[]> {
  return ['main', 'develop', 'feature/auth', 'feature/dashboard', 'fix/login-bug'];
}
