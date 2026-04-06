/**
 * Add Marketplace Use Case
 *
 * Registers a new marketplace URL with the Claude Code CLI.
 * Used by the "Test Connection" button in Settings.
 */

import { injectable, inject } from 'tsyringe';
import type {
  IPluginMarketplaceService,
  PluginOperationResult,
} from '../../ports/output/services/plugin-marketplace.interface.js';

export interface AddMarketplaceInput {
  url: string;
}

@injectable()
export class AddMarketplaceUseCase {
  constructor(
    @inject('IPluginMarketplaceService')
    private readonly marketplaceService: IPluginMarketplaceService
  ) {}

  async execute(input: AddMarketplaceInput): Promise<PluginOperationResult> {
    return this.marketplaceService.addMarketplace(input.url);
  }
}
