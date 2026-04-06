/**
 * Install Plugin Use Case
 *
 * Installs a Claude Code plugin via the CLI subprocess.
 */

import { injectable, inject } from 'tsyringe';
import type {
  IPluginMarketplaceService,
  PluginOperationResult,
} from '../../ports/output/services/plugin-marketplace.interface.js';

export interface InstallPluginInput {
  pluginId: string;
  marketplace: string;
  scope?: string;
}

@injectable()
export class InstallPluginUseCase {
  constructor(
    @inject('IPluginMarketplaceService')
    private readonly marketplaceService: IPluginMarketplaceService
  ) {}

  async execute(input: InstallPluginInput): Promise<PluginOperationResult> {
    return this.marketplaceService.installPlugin(input.pluginId, input.marketplace, input.scope);
  }
}
