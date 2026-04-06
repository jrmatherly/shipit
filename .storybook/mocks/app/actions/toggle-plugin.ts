export async function togglePluginAction(
  _pluginId: string,
  _marketplace: string,
  _enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  return { success: true };
}
