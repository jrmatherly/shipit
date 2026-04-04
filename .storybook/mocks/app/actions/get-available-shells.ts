export interface AvailableShell {
  id: string;
  name: string;
  available: boolean;
}

export async function getAvailableShells(): Promise<AvailableShell[]> {
  return [
    { id: 'bash', name: 'Bash', available: true },
    { id: 'zsh', name: 'Zsh', available: true },
    { id: 'fish', name: 'Fish', available: false },
  ];
}
