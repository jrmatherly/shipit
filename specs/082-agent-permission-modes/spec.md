## Problem Statement

Every executor hard-codes its bypass flag with no user opt-out. README promises "permission-bypass
flags" but users who want tighter agent permissions (regulated environments, shared runners,
privacy-sensitive codebases) cannot change the behavior without forking.

Worse, research uncovered **4 latent write-failure bugs** across Cursor, Codex, Copilot, and Rovo
executors where the permission flags are either missing or never emitted due to inverted logic.

## Bug Fixes (Critical — PR 5 scope)

| Agent | Bug | Severity | Fix |
|-------|-----|----------|-----|
| Cursor | Missing `--force` — writes proposed but never applied in `-p` mode | High (data loss) | Add `--force` to yolo mode |
| Codex | Missing `--ask-for-approval never` — approval policy defaults to prompting | Medium (hang) | Add explicit flag |
| Copilot | Inverted `allowedTools` heuristic — `--yolo` never emitted | High (hang/reject) | Delete heuristic, emit per-mode flags |
| Rovo Dev | Same inverted heuristic — `--yolo` never emitted | High (hang/reject) | Delete heuristic, emit per-mode flags |

## Feature: Per-Agent Native Permission Modes

Each agent declares its own native modes as a domain-level TypeSpec enum. No universal enum.
No fallbacks. UI surfaces show only what the selected agent supports.

- Claude Code: 4 modes (default, acceptEdits, plan, bypassPermissions)
- Cursor: 2 modes (propose, yolo)
- Gemini: 3 modes (default, auto_edit, yolo)
- Codex: 3 modes (read-only, workspace-write, danger-full-access)
- Copilot: 3 modes (prompt, allow-paths, yolo)
- Rovo Dev: 3 modes (config, shadow, yolo)

## DI Debt Cleanup

Extract `ISettingsReader` port to replace 9 `getSettings()`/`hasSettings()` global accessor
calls across `packages/core/src/infrastructure/services/agents/`. Required by code-quality
rules ("No Singletons or Global State Outside Infrastructure Bootstrapping").

## Success Criteria

- [ ] Each executor supports only its own native permission modes via TypeSpec enum
- [ ] Cursor yolo mode emits both `--yolo` and `--force` (bug fix)
- [ ] Codex always emits `--ask-for-approval never` alongside sandbox flag (bug fix)
- [ ] Copilot inverted heuristic deleted; correct flags emitted per mode (bug fix)
- [ ] Rovo Dev inverted heuristic deleted; correct flags emitted per mode (bug fix)
- [ ] Claude Code batch executor throws clear error on non-batch modes
- [ ] Gemini emits `--approval-mode <mode>` replacing legacy `-y`
- [ ] `ISettingsReader` port extracted; 9 call sites converted to DI
- [ ] Per-agent permission stored in 6 SQLite columns (migration 052)
- [ ] Per-feature permission override stored (migration 053)
- [ ] Settings UI shows only selected agent's modes
- [ ] Onboarding wizard Step B per selected agent
- [ ] CLI `settings permissions` command with per-agent validation
- [ ] `AgentType.Dev` removed; Aider/Continue hidden from UI
- [ ] All 8 locale files have matching key sets
- [ ] Every new code path has a failing test before implementation (TDD)
- [ ] `pnpm test` green on ubuntu-latest and windows-latest

## Affected Areas

| Area | Impact | Reasoning |
|------|--------|-----------|
| TypeSpec enums | New file | 6 per-agent permission mode enums |
| Executor services (7) | Major | Each gets dynamic permission-mode consumption |
| Settings mapper | Major | 6 new columns round-tripped |
| Feature mapper | Minor | 1 new column for per-feature override |
| DI modules | Major | ISettingsReader port + registration + 9 call-site conversions |
| node-helpers.ts | Major | Permission resolution + ISettingsReader injection |
| Settings defaults factory | Minor | Initialize permissions with current defaults |
| Onboarding wizard | New file | Step B per-agent picker |
| Settings UI | Moderate | Embed AgentPermissionPicker component |
| CLI commands | New file | `settings permissions` command |
| i18n (8 locales) | Minor | New keys for permissions UI |
| Dev agent call sites | Deletion | Remove AgentType.Dev from enum + all consumers |

## Dependencies

- Specs 008-agent-configuration (existing agent type enum)
- Specs 015-cursor-support (cursor executor being modified)
- Specs 035-gemini-cli-executor-2 (gemini executor being modified)
- Specs 041-dev-mock-agent-executor (dev agent being removed)

## Size Estimate

**XL** — 11 PRs in the plan, ~70 files to create/modify across all 3 core layers + presentation.
Four bug fixes, 6 TypeSpec enums, 2 migrations, 7 executor refactors, DI port extraction,
CLI command, web UI components, onboarding flow, and i18n across 8 locales.

## Rollout Plan (from implementation plan v2)

1. PR 1 — Dev agent call-site cleanup + Aider/Continue hide
2. PR 2 — Delete DevAgentExecutorService + fixtures
3. PR 3 — Remove Dev from TypeSpec enum
4. PR 4 — Per-agent native enums + migration 052 + mapper + resolver + ISettingsReader DI
5. PR 5 — Executor refactors (4 bug fixes + permission mode feature)
6. PR 6 — Option propagation (buildExecutorOptions + auxiliary call sites)
7. PR 7 — Per-feature override (migration 053, feature mapper, CLI flag)
8. PR 8 — CLI settings permissions command + i18n
9. PR 9 — Web UI: AgentPermissionPicker + settings + drawer + stories
10. PR 10 — Onboarding wizard Step B + factory defaults
11. PR 11 — README + docs

---

_Generated by `/shipit-kit:new-feature` — proceed with `/shipit-kit:research`_
