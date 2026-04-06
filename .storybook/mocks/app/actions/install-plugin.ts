export async function installPluginAction(
  _pluginId: string,
  _marketplace: string,
  _scope?: string
): Promise<{ success: boolean; error?: string }> {
  return { success: true };
}
