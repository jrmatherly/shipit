/**
 * Toggle Plugin Use Case
 *
 * Enables or disables a Claude Code plugin via the CLI subprocess.
 */

import { injectable, inject } from 'tsyringe';
import type {
  IPluginMarketplaceService,
  PluginOperationResult,
} from '../../ports/output/services/plugin-marketplace.interface.js';

export interface TogglePluginInput {
  pluginId: string;
  marketplace: string;
  enabled: boolean;
}

@injectable()
export class TogglePluginUseCase {
  constructor(
    @inject('IPluginMarketplaceService')
    private readonly marketplaceService: IPluginMarketplaceService
  ) {}

  async execute(input: TogglePluginInput): Promise<PluginOperationResult> {
    return this.marketplaceService.togglePlugin(input.pluginId, input.marketplace, input.enabled);
  }
}
