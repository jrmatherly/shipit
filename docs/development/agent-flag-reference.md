# Agent Permission Flag Reference

Living document. Last verified: April 2026.

Each section documents the upstream CLI flags that Shipit maps to its TypeSpec permission mode enums. The TypeSpec definitions live in [`tsp/common/enums/agent-permissions.tsp`](../../tsp/common/enums/agent-permissions.tsp).

---

## Claude Code

| Shipit Enum Value    | CLI Flag                                                         | Behavior                                       |
| -------------------- | ---------------------------------------------------------------- | ---------------------------------------------- |
| `bypassPermissions`  | `--dangerously-skip-permissions` or `--permission-mode bypassPermissions` | Full bypass -- skip all permission checks      |
| `acceptEdits`        | `--permission-mode acceptEdits`                                  | Auto-approve file edits; prompt for shell/network |
| `plan`               | `--permission-mode plan`                                         | Read-only plan mode -- proposes without acting  |
| `default`            | `--permission-mode default`                                      | Prompt for everything except reads              |

**Batch default:** `bypassPermissions`

Source: <https://code.claude.com/docs/en/permissions>

---

## Cursor

| Shipit Enum Value | CLI Flag             | Behavior                                          |
| ----------------- | -------------------- | ------------------------------------------------- |
| `yolo`            | `--yolo --force`     | Auto-approve shell commands and file writes        |
| `propose`         | _(print mode, no force)_ | Outputs a diff without writing                 |

**Batch default:** `yolo`

Both `--yolo` (shell commands) and `--force` (file writes in print mode) are needed for full non-interactive batch execution.

Source: <https://cursor.com/docs/cli/reference/parameters>

---

## Gemini CLI

| Shipit Enum Value | CLI Flag                                | Behavior                                     |
| ----------------- | --------------------------------------- | -------------------------------------------- |
| `yolo`            | `--approval-mode yolo` (or legacy `-y`) | Auto-approve all tool calls                  |
| `auto_edit`       | `--approval-mode auto_edit`             | Auto-approve edits; prompt for shell         |
| `default`         | `--approval-mode default`               | Prompt for every tool call                   |

**Batch default:** `yolo`

Known issues as of April 2026: upstream bugs #13561, #19774, #16012 affect non-interactive mode reliability.

Source: <https://geminicli.com/docs/reference/configuration/>

---

## Codex CLI

| Shipit Enum Value      | CLI Flag                            | Behavior                                    |
| ---------------------- | ----------------------------------- | ------------------------------------------- |
| `danger-full-access`   | `--sandbox danger-full-access --ask-for-approval never` | Unrestricted access                |
| `workspace-write`      | `--sandbox workspace-write --ask-for-approval never`    | Writes inside worktree only, no network |
| `read-only`            | `--sandbox read-only --ask-for-approval never`          | Cannot modify anything              |

**Batch default:** `danger-full-access`

All modes pair with `--ask-for-approval never` for non-interactive execution.

Source: <https://developers.openai.com/codex/cli/reference>

---

## Copilot CLI

| Shipit Enum Value | CLI Flag                                | Behavior                                        |
| ----------------- | --------------------------------------- | ----------------------------------------------- |
| `yolo`            | `--yolo` (alias: `--allow-all`)         | Skip all permission prompts (tools + paths + URLs) |
| `allow-paths`     | `--allow-all-paths`                     | Filesystem auto-approved; shell still prompts   |
| `prompt`          | _(no flags)_                            | Built-in tool category defaults                 |

**Batch default:** `yolo`

`--yolo` is equivalent to `--allow-all-tools` + `--allow-all-paths` + `--allow-all-urls`.

Source: <https://docs.github.com/en/copilot/how-tos/copilot-cli/allowing-tools>

---

## Rovo Dev

| Shipit Enum Value | CLI Flag     | Behavior                                           |
| ----------------- | ------------ | -------------------------------------------------- |
| `yolo`            | `--yolo`     | Bypass all prompts                                 |
| `shadow`          | `--shadow`   | Temporary workspace clone (experimental, April 2026) |
| `config`          | _(no flag)_  | Respects `~/.rovodev/config.yml`                   |

**Batch default:** `yolo`

The `--shadow` flag is experimental and not yet in upstream stable docs as of April 2026.

Source: <https://support.atlassian.com/rovo/docs/use-tools-in-rovo-dev-cli/>

---

## Maintaining This Document

**Update when:**

- An agent ships new permission flags or deprecates existing ones
- A new agent type is added to Shipit
- Upstream URLs change

**Related docs:**

- [Agent System Architecture](../architecture/agent-system.md)
- [Adding Agents](./adding-agents.md)
- [TypeSpec enums](../../tsp/common/enums/agent-permissions.tsp)
