# Data Model: claude-code-plugin-marketplace

> Entity definitions for 083-claude-code-plugin-marketplace

## Status

- **Phase:** Planning
- **Updated:** 2026-04-06

## Overview

This feature extends the existing Settings domain model with LiteLLM proxy configuration
and a new feature flag. No new top-level entities are created -- the plugin marketplace
catalog and installed plugin state are external DTOs (from LiteLLM and Claude CLI), not
persisted ShipIT domain entities.

## New Entities

### LiteLLMProxyConfig

**Location:** `tsp/domain/entities/settings.tsp` (embedded in Settings model)

| Property           | Type    | Required | Description                                                      |
| ------------------ | ------- | -------- | ---------------------------------------------------------------- |
| baseUrl            | string  | No       | LiteLLM proxy base URL (e.g., http://localhost:4000)             |
| apiKey             | string  | No       | API key for LiteLLM proxy (virtual key). Plaintext in SQLite.    |
| marketplaceEnabled | boolean | No       | Whether to use this proxy for the plugin marketplace             |

**TypeSpec definition:**

```typespec
@doc("LiteLLM proxy configuration for plugin marketplace and model routing")
model LiteLLMProxyConfig {
  @doc("LiteLLM proxy base URL (e.g., http://localhost:4000)")
  baseUrl?: string;

  @doc("API key for the LiteLLM proxy (virtual key). Stored in plaintext in SQLite consistent with agent.token pattern.")
  apiKey?: string;

  @doc("Whether to use this proxy for the plugin marketplace")
  marketplaceEnabled?: boolean;
}
```

**Relationships:**

- Embedded within the `Settings` model as `litellmProxy?: LiteLLMProxyConfig`

## Modified Entities

### Settings

**Changes:**

- Add: `litellmProxy?: LiteLLMProxyConfig` -- LiteLLM proxy configuration

### FeatureFlags

**Changes:**

- Add: `plugins?: boolean` (default: false) -- Enable the Claude Code plugins marketplace browser

**TypeSpec addition:**

```typespec
@doc("Enable the Claude Code plugins marketplace browser")
plugins?: boolean;
```

## External DTOs (Port Interfaces, Not Persisted)

These types represent external data shapes from LiteLLM and Claude CLI.
They are defined as TypeScript interfaces in the port, not as TypeSpec domain models.

### PluginMarketplaceEntry

**Location:** `packages/core/src/application/ports/output/services/plugin-marketplace.interface.ts`

| Property    | Type                   | Required | Description                        |
| ----------- | ---------------------- | -------- | ---------------------------------- |
| name        | string                 | Yes      | Plugin name                        |
| description | string                 | Yes      | Plugin description                 |
| version     | string                 | No       | Plugin version                     |
| source      | PluginSource           | Yes      | Source location (GitHub/URL/subdir) |
| category    | string                 | No       | Plugin category                    |
| keywords    | string[]               | No       | Search keywords                    |

### InstalledPlugin

**Location:** `packages/core/src/application/ports/output/services/plugin-marketplace.interface.ts`

| Property    | Type                         | Required | Description                                |
| ----------- | ---------------------------- | -------- | ------------------------------------------ |
| id          | string                       | Yes      | Plugin ID (e.g., "superpowers@marketplace")|
| scope       | 'user' \| 'project' \| 'local' | Yes   | Installation scope                         |
| version     | string                       | No       | Installed version                          |
| enabled     | boolean                      | Yes      | Whether plugin is enabled                  |
| installedAt | string                       | No       | Installation timestamp                     |

## SQLite Migration (054)

| Column                              | Type    | Default | Maps to                             |
| ----------------------------------- | ------- | ------- | ----------------------------------- |
| litellm_proxy_base_url              | TEXT    | NULL    | settings.litellmProxy.baseUrl       |
| litellm_proxy_api_key               | TEXT    | NULL    | settings.litellmProxy.apiKey        |
| litellm_proxy_marketplace_enabled   | INTEGER | 0       | settings.litellmProxy.marketplaceEnabled |
| feature_flag_plugins                | INTEGER | 0       | settings.featureFlags.plugins       |

---

_Data model changes for TypeSpec compilation_
