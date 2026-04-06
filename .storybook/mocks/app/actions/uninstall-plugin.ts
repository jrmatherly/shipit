export async function uninstallPluginAction(
  _pluginId: string,
  _marketplace: string
): Promise<{ success: boolean; error?: string }> {
  return { success: true };
}
