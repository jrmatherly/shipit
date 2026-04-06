/**
 * Uninstall Plugin Use Case
 *
 * Uninstalls a Claude Code plugin via the CLI subprocess.
 */

import { injectable, inject } from 'tsyringe';
import type {
  IPluginMarketplaceService,
  PluginOperationResult,
} from '../../ports/output/services/plugin-marketplace.interface.js';

export interface UninstallPluginInput {
  pluginId: string;
  marketplace: string;
}

@injectable()
export class UninstallPluginUseCase {
  constructor(
    @inject('IPluginMarketplaceService')
    private readonly marketplaceService: IPluginMarketplaceService
  ) {}

  async execute(input: UninstallPluginInput): Promise<PluginOperationResult> {
    return this.marketplaceService.uninstallPlugin(input.pluginId, input.marketplace);
  }
}
