export interface AvailableEditor {
  id: string;
  name: string;
  available: boolean;
}

export async function getAvailableEditors(): Promise<AvailableEditor[]> {
  return [
    { id: 'vscode', name: 'VS Code', available: true },
    { id: 'cursor', name: 'Cursor', available: true },
    { id: 'windsurf', name: 'Windsurf', available: false },
    { id: 'zed', name: 'Zed', available: true },
    { id: 'antigravity', name: 'Antigravity', available: false },
  ];
}
