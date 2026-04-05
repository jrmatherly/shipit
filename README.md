<div align="center">

<h1>
  <img src="src/presentation/web/public/shipit-logo.png" alt="ShipIT AI logo" width="32" valign="middle" />
  ShipIT
</h1>

### Run multiple AI agents in parallel. Each in its own worktree

_Manage 10 features at once — isolated branches, automatic commits, CI watching, and PRs — from a dashboard or the terminal._

[![CI](https://github.com/jrmatherly/shipit/actions/workflows/ci.yml/badge.svg)](https://github.com/jrmatherly/shipit/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@shipit-ai/cli.svg?color=cb3837&logo=npm)](https://www.npmjs.com/package/@shipit-ai/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[Quick Start](#quick-start) · [How It Works](#how-it-works) · [Features](#features) · [Trust & Safety](#trust--safety) · [FAQ](#faq)

<br />

<img src="docs/screenshots/cover.png" alt="Shipit — Parallel AI Agent Sessions" width="900" />

</div>

---

## Why Shipit?

You're already using AI coding agents. The problem isn't the coding — it's everything around it.

Switching branches. Stashing changes. Watching CI. Assembling PRs. Losing context when you juggle three things at once. One agent session is fine. Five is chaos.

**Shipit gives each feature its own isolated world** — a git worktree, a branch, an agent session — and handles the boring parts: committing, pushing, opening PRs, watching CI, and fixing failures. You manage it all from one dashboard or the CLI.

```bash
shipit-ai feat new "add stripe payments" --push --pr
shipit-ai feat new "add dark mode toggle" --push --pr
shipit-ai feat new "fix login redirect bug" --push --pr
# Three agents running in parallel. Zero branch conflicts. You monitor from one place.
```

---

## Quick Start

### Prerequisites

- **Node.js 22+** and **npm** (or install via `nvm`)
- **Git** and **GitHub CLI** (`gh`) — [install guide](https://cli.github.com/)
- **An AI coding agent**, authenticated and ready:
  - **Claude Code**: `claude` · **Cursor CLI**: `cursor` · **Gemini CLI**: `gemini`
  - If prompted to log in, complete auth first — Shipit can't authenticate on your behalf.

> **Sandbox mode note:** Some agents restrict network access by default. If operations like `npm install` fail, configure allowed hosts in your agent's settings or disable sandbox for Shipit features. See [Agent Permissions](#agent-permissions).

### Install and run

```bash
# Try it instantly — no install needed
npx @shipit-ai/cli

# Or install globally
npm i -g @shipit-ai/cli

# Start Shipit — opens the web dashboard at localhost:4050
shipit-ai
```

### Your first feature

```bash
cd ~/projects/my-app        # Any git repo. Shipit uses the repo you're in.
shipit-ai feat new "add a /health endpoint that returns uptime and version" --push --pr

# Shipit creates a worktree, runs your agent, commits, pushes, and opens a PR.
```

Not in a git repo? Shipit initializes one for you — `git init`, creates a branch, and starts working.

Or use the dashboard — describe what you need, configure automation, and hit create:

<div align="center">
<img src="docs/screenshots/create-feature.png" alt="Shipit — Create Feature with configurable automation" width="900" />
</div>

### Go parallel

```bash
shipit-ai feat new "add stripe payments" --push --pr
shipit-ai feat new "add dark mode toggle" --push --pr
shipit-ai feat new "refactor auth middleware" --push --pr
# All three run simultaneously in the same repo. Each in its own worktree.
```

Launch from CLI or dashboard — monitor everything in one place. Open any feature in your IDE, terminal, or file manager with one click:

<div align="center">
<img src="docs/screenshots/parallel-features.png" alt="Shipit — Three features running in parallel" width="900" />
</div>

Or work across multiple repos:

```bash
shipit-ai feat new "add payments" --repo ~/projects/backend --push --pr
shipit-ai feat new "add checkout UI" --repo ~/projects/frontend --push --pr
```

Manage multiple repos from one dashboard. Start a local dev server per feature, chat with Shipit for questions or HTML previews — all without leaving the UI:

<div align="center">
<img src="docs/screenshots/multi-repo.png" alt="Shipit — Multiple repos with global chat and HTML preview" width="900" />
</div>

---

## How It Works

The default flow is simple: **prompt → implement → commit → push → PR**.

```
 You describe       Agent codes         Shipit commits        Shipit pushes         Shipit opens
 a feature    →     in a worktree  →    the changes    →    to remote      →    a PR
```

Shipit creates an isolated git worktree, hands your prompt to the agent, and handles everything after: committing, pushing, and opening a PR. If CI fails, Shipit reads the logs, fixes the issue, and retries (configurable).

### Configure everything

Every step of the pipeline is configurable. Turn things on or off per feature or set defaults:

| Flag | What it does | Default |
|------|-------------|---------|
| `--push` | Auto-push after implementation | off |
| `--pr` | Auto-create PR after push | off |
| `--fast` | Skip spec-driven phases, go straight to coding | on |
| `--allow-merge` | Auto-merge the PR after CI passes | off |
| `--allow-all` | Enable all automations | off |
| `--model` | Choose which AI model to use | agent default |
| `--attach` | Attach reference files for context | — |

Use `shipit-ai settings workflow` to set your defaults so you don't repeat flags.

### Optional: Spec-Driven Development

For complex features, enable the full structured pipeline with requirements, research, and planning phases:

```bash
# Disable --fast to get the full pipeline
shipit-ai feat new "redesign the payment system" --no-fast --push --pr
```

This adds **approval gates** where Shipit pauses for your review:

```
 Prompt  →  Requirements  →  Research  →  Plan  →  Implement  →  Commit  →  PR
                 ▲                          ▲                                ▲
             Gate 1: PRD              Gate 2: Plan                    Gate 3: Merge
```

Each gate produces a YAML artifact you can read, edit, and approve before the agent continues. Use `--allow-prd` and `--allow-plan` to auto-approve individual gates, or keep them manual for full control.

> **[Spec-Driven Development guide →](./docs/development/spec-driven-workflow.md)**

---

## Features

### Parallel Sessions

Run multiple features at once. Each gets its own git worktree — isolated branch, isolated files, zero conflicts. Monitor all of them from one dashboard.

### Prompt to PR

One command: `shipit-ai feat new "do X" --push --pr`. Agent implements, Shipit commits, pushes, opens a PR. Done.

### Agent-Agnostic

Use Claude Code, Cursor CLI, or Gemini CLI. Swap per feature, per repo, anytime. If it runs in a terminal, Shipit can orchestrate it.

### Web Dashboard + CLI

Two ways to manage everything. The dashboard at `localhost:4050` shows a visual graph of all repos and features with real-time status, diff review, and interactive chat. The CLI gives you the same control from the terminal.

### CI Watch & Auto-Fix

Shipit watches your CI pipeline after push. If it fails, the agent reads the logs, diagnoses the problem, and pushes a fix. Retries are configurable (default: 3). Works best when CI produces clear error messages.

### Everything Configurable

Push, PR, merge, CI watch, CI fix retries, timeouts, model selection, agent type — configure per feature with flags or set global defaults with `shipit-ai settings`. Nothing is hardcoded.

### 100% Local

All data lives in `~/.shipit-ai/` as SQLite. No cloud, no account, no tracking. Your code is only sent to whichever AI agent you configure, under that agent's own terms.

### Optional: Spec-Driven Development

When you need more structure — requirements, technical research, implementation plans with approval gates. Produces versioned YAML artifacts you review before any code is written. Enable per feature with `--no-fast`.

---

## What Happens When Things Go Wrong

- **CI fails.** Shipit reads the logs, diagnoses the problem, and pushes a fix. Retries up to 3 times (configurable), then pauses and asks you.
- **Agent gets stuck.** The feature enters a `Blocked` state. You get notified and can provide feedback or restart from a checkpoint.
- **You need to stop immediately.** Run `shipit-ai agent stop <id>` or hit the stop button in the dashboard. The worktree is preserved — resume or take over manually.
- **You want to take over.** The code lives in a standard git worktree on a named branch. Open it in your IDE at any point.
- **Too many features in flight.** Each feature is independent. Stop, pause, or delete any of them without affecting the others.

---

## Trust & Safety

Shipit runs entirely on your machine.

| Concern | How Shipit handles it |
|---------|-------------------|
| **Data stays local** | All data in `~/.shipit-ai/` as SQLite. Nothing sent to Shipit servers — there are none. |
| **Agent permissions** | Shipit runs your agent with permission-bypass flags to avoid blocking the automated pipeline. See [Agent Permissions](#agent-permissions) below. |
| **Git isolation** | Every feature runs in its own worktree branched from main. Your working directory is never modified. |
| **No credential access** | Shipit never reads, stores, or transmits your API keys. |
| **Agent mistakes** | Shipit creates a draft PR. Your CI, linters, and security scanners run before any merge. Shipit does not merge code that fails CI. |
| **Review before merge** | Unless you pass `--allow-merge`, no code is merged without your approval. |
| **Full audit trail** | Every action and state transition is logged. View with `shipit-ai feat logs <id>`. |

### Agent Permissions

Shipit runs your agent non-interactively -- it can't pause for "allow this command?" prompts mid-pipeline. Each agent has its own permission modes mapped to native CLI flags:

| Agent | Default (batch) | Tighter Options |
|-------|----------------|-----------------|
| Claude Code | `bypassPermissions` | `acceptEdits`, `plan`, `default` |
| Cursor | `yolo` | `propose` |
| Gemini CLI | `yolo` | `auto_edit`, `default` |
| Codex CLI | `danger-full-access` | `workspace-write`, `read-only` |
| Copilot CLI | `yolo` | `allow-paths`, `prompt` |
| Rovo Dev | `yolo` | `shadow`, `config` |

Configure per-agent defaults or override per-feature:

```bash
# Set Claude Code to auto-approve edits but prompt for shell commands
shipit-ai settings permissions --agent claude-code --mode acceptEdits

# Run a single feature in read-only plan mode
shipit-ai feat new "redesign auth" --permission-mode plan
```

**Your safety net is three layers deep:**
1. **Worktree isolation** -- the agent works on a copy, not your checkout
2. **Draft PRs** -- you review the diff before anything is merged
3. **CI pipeline** -- your tests, linters, and security scanners run before merge

The bypass default is not a requirement. Tighten permissions globally or per-feature to match your risk tolerance.

**What Shipit does NOT protect you from:** If your CI doesn't catch a vulnerability, Shipit won't either. Shipit is an orchestration layer, not a security scanner.

> **[Full agent permission flag reference -->](./docs/development/agent-flag-reference.md)**

---

## Supported Agents & Tools

| Category | Supported |
|----------|-----------|
| **AI Agents** | Claude Code, Cursor CLI, Gemini CLI, Codex CLI, Aider, Continue |
| **IDEs** | VS Code, Cursor, Zed, Windsurf, and more |
| **Required** | Git, GitHub CLI (`gh`) |

---

## CLI Reference

### Core Commands

```
shipit-ai                         Start daemon + onboarding (first run)
shipit-ai feat new <description>       Create a new feature
      [--push] [--pr] [--fast] [--model] [--attach]
      [--allow-prd] [--allow-plan] [--allow-merge] [--allow-all]
shipit-ai feat ls                      List features
shipit-ai feat show <id>               Show feature details
shipit-ai feat resume <id>             Resume a paused feature
shipit-ai feat approve <id>            Approve current phase (spec-driven mode)
shipit-ai feat reject <id> --feedback  Reject with feedback (spec-driven mode)
shipit-ai feat logs <id>               View feature logs
```

### Stopping a Feature

```
shipit-ai agent stop <id>              Stop a running agent immediately
shipit-ai agent ls                     Find the agent ID for a feature
```

The web dashboard also has a stop button on every in-progress feature.

### Daemon & Dashboard

```
shipit-ai start [--port]               Start web daemon (default: 4050)
shipit-ai stop                         Stop the daemon
shipit-ai status                       Show daemon status and metrics
shipit-ai ui                           Start web UI in foreground
```

### Settings & Configuration

```
shipit-ai settings                     Launch setup wizard
shipit-ai settings workflow            Configure default flags (push, pr, ci watch, etc.)
shipit-ai settings agent               Configure AI coding agent
shipit-ai settings ide                 Configure IDE
shipit-ai settings model               Configure default model
```

### Agent & Repo Management

```
shipit-ai agent ls                     List agent runs
shipit-ai agent stop <id>              Stop a running agent
shipit-ai agent logs <id>              View agent logs
shipit-ai repo ls                      List repositories
```

> **[Full CLI reference →](./docs/cli/architecture.md)**

---

## FAQ

**How is this different from just using an AI coding agent directly?**

Your agent writes the code. Shipit manages the session: creating the worktree, committing, pushing, opening PRs, watching CI, and retrying failures. The difference is most obvious when you're running 3-5 features in parallel — Shipit keeps them organized and isolated while you focus on what matters.

**How is this different from Superset?**

Superset is a terminal multiplexer for agents — it runs them in parallel tabs. Shipit manages the development lifecycle: worktrees, commits, pushes, PRs, CI. They're complementary. Use Superset for the execution environment, Shipit for the workflow.

**What happens if the agent writes bad code?**

Shipit creates a draft PR. Your CI runs. If tests fail, the agent reads the logs and attempts a fix (up to 3 retries, configurable). If that fails, the feature pauses and you're notified. The agent never merges code that fails CI.

**What about agent sandbox / permission modes?**

Shipit runs the agent with permission-bypass flags by default so the pipeline isn't blocked by interactive prompts. Your protection is worktree isolation, draft PRs, and your CI pipeline. See [Agent Permissions](#agent-permissions).

**Does this work on large codebases?**

Yes. The practical limit is the underlying agent's context window, not Shipit. If your agent handles your repo well directly, Shipit will too. For monorepos, scope features to specific packages with `--repo`.

**Can I use this on a team?**

Shipit runs locally on your git repo. Multiple team members can run Shipit independently. Features are just branches and PRs — your existing review process applies.

**Is my code sent anywhere?**

Not by Shipit. Your code is sent to whichever AI agent you configure, under that agent's own privacy terms. Shipit stores everything locally and makes no network calls.

**What's the spec-driven mode?**

An optional structured pipeline that adds requirements, research, and planning phases with approval gates before any code is written. Useful for complex features where you want to review the approach first. Enable with `--no-fast`. [Learn more →](./docs/development/spec-driven-workflow.md)

**How do I stop a feature that's running?**

CLI: `shipit-ai agent stop <id>`. Dashboard: click the stop button. The worktree is preserved — resume with `shipit-ai feat resume <id>` or work on it manually.

---

## Architecture

Shipit follows Clean Architecture with four layers. For contributors and the curious:

| Layer | Responsibility |
|-------|---------------|
| **Domain** | Business logic, TypeSpec-generated types |
| **Application** | Use cases, port interfaces |
| **Infrastructure** | SQLite, LangGraph agents, DI |
| **Presentation** | CLI, Web UI |

> **[Full architecture docs →](./docs/architecture/overview.md)**

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for humans and [CONTRIBUTING-AGENTS.md](./CONTRIBUTING-AGENTS.md) for AI agents.

---

## Star History

<a href="https://www.star-history.com/?repos=jrmatherly%2Fshipit&type=timeline&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/image?repos=jrmatherly/shipit&type=timeline&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/image?repos=jrmatherly/shipit&type=timeline&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/image?repos=jrmatherly/shipit&type=timeline&legend=top-left" />
 </picture>
</a>

---

## Acknowledgments

ShipIT is a fork of [Shep](https://github.com/shep-ai/shep) by [Shep AI](https://github.com/shep-ai). We're grateful for their foundational work on parallel AI agent orchestration.

---

## License

MIT — see [LICENSE](./LICENSE).
