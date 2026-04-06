# Data Model: litellm-multi-agent-proxy

> Entity definitions for 085-litellm-multi-agent-proxy

## Status

- **Phase:** Planning
- **Updated:** 2026-04-06

## Overview

Adds two minimal per-agent proxy config models (GeminiCliProxyConfig, CodexCliProxyConfig) as siblings to the existing ClaudeCodeProxyConfig under LiteLLMProxyConfig. Reuses the existing LiteLLMProxyRoutingMode enum.

## New Entities

### GeminiCliProxyConfig

**Location:** `tsp/domain/entities/settings.tsp`

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| routingMode | LiteLLMProxyRoutingMode | No | How Gemini CLI routes API traffic: direct or proxy |

### CodexCliProxyConfig

**Location:** `tsp/domain/entities/settings.tsp`

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| routingMode | LiteLLMProxyRoutingMode | No | How Codex CLI routes API traffic: direct or proxy |

## Modified Entities

### LiteLLMProxyConfig

- Add: `geminiCli?: GeminiCliProxyConfig`
- Add: `codexCli?: CodexCliProxyConfig`

## Database Columns (Migration 056)

| Column | Type | Default | Maps To |
| --- | --- | --- | --- |
| `litellm_proxy_gc_routing_mode` | TEXT | NULL | `litellmProxy.geminiCli.routingMode` |
| `litellm_proxy_cx_routing_mode` | TEXT | NULL | `litellmProxy.codexCli.routingMode` |

---

_Data model changes for TypeSpec compilation_
