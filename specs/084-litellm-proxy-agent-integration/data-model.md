# Data Model: litellm-proxy-agent-integration

> Entity definitions for 084-litellm-proxy-agent-integration

## Status

- **Phase:** Planning
- **Updated:** 2026-04-06

## Overview

Extends the existing `LiteLLMProxyConfig` model with a nested `ClaudeCodeProxyConfig` for per-agent proxy routing. Adds a `LiteLLMProxyRoutingMode` enum. No new top-level entities — all changes nest under the existing `Settings.litellmProxy` path.

## New Entities

### ClaudeCodeProxyConfig

**Location:** `tsp/domain/entities/settings.tsp` (nested inside LiteLLMProxyConfig section)

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| routingMode | LiteLLMProxyRoutingMode | No | How Claude Code routes API traffic: direct, proxy, or passthrough |
| customHeaders | string | No | Newline-separated key: value headers for ANTHROPIC_CUSTOM_HEADERS |
| sonnetModel | string | No | Model name override for ANTHROPIC_DEFAULT_SONNET_MODEL |
| haikuModel | string | No | Model name override for ANTHROPIC_DEFAULT_HAIKU_MODEL |
| opusModel | string | No | Model name override for ANTHROPIC_DEFAULT_OPUS_MODEL |

**Relationships:**

- Child of `LiteLLMProxyConfig` (accessed via `settings.litellmProxy.claudeCode`)
- Consumed by `ClaudeCodeExecutorService.buildSpawnEnv()`

## Modified Entities

### LiteLLMProxyConfig

**Changes:**

- Add: `claudeCode?: ClaudeCodeProxyConfig` — per-agent proxy routing config for Claude Code

### Settings (indirect)

**Changes:**

- No direct changes — `LiteLLMProxyConfig` is already referenced as `settings.litellmProxy`
- New fields flow through existing persistence pipeline

## Enums

### LiteLLMProxyRoutingMode

**Location:** `tsp/domain/entities/settings.tsp` (colocated with LiteLLMProxyConfig)

| Value | Description |
| --- | --- |
| `direct` | No proxy routing — Claude Code uses its own auth (default) |
| `proxy` | Full proxy routing — ANTHROPIC_BASE_URL + ANTHROPIC_AUTH_TOKEN |
| `passthrough` | Proxy with forwarded user auth — ANTHROPIC_BASE_URL + ANTHROPIC_CUSTOM_HEADERS |

## Database Columns (Migration)

New columns added to `settings` table:

| Column | Type | Default | Maps To |
| --- | --- | --- | --- |
| `litellm_proxy_cc_routing_mode` | TEXT | NULL | `litellmProxy.claudeCode.routingMode` |
| `litellm_proxy_cc_custom_headers` | TEXT | NULL | `litellmProxy.claudeCode.customHeaders` |
| `litellm_proxy_cc_sonnet_model` | TEXT | NULL | `litellmProxy.claudeCode.sonnetModel` |
| `litellm_proxy_cc_haiku_model` | TEXT | NULL | `litellmProxy.claudeCode.haikuModel` |
| `litellm_proxy_cc_opus_model` | TEXT | NULL | `litellmProxy.claudeCode.opusModel` |

All TEXT with NULL default — absent means "not configured" (routingMode defaults to "direct" in domain logic, not DB).

---

_Data model changes for TypeSpec compilation_
