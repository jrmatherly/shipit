# CLAUDE.md

Guidance for Claude Code working in this repository.

## Project

`@shipit-ai/cli` — Autonomous AI Native SDLC Platform (forked from shep-ai/shep). Repo: `jrmatherly/shipit`. Users run `shipit-ai` in a repo to gather requirements via AI, generate plans, and execute implementation autonomously.

## Spec Workflow

**All feature work MUST begin with `/shipit-kit:new-feature`.** See [spec-driven-workflow](./docs/development/spec-driven-workflow.md).

`/shipit-kit:new-feature → /shipit-kit:research → /shipit-kit:plan → /shipit-kit:implement → /shipit-kit:commit-pr`

Specs live in `specs/NNN-feature-name/`. **Edit YAML only — Markdown is auto-generated.**

## Commands

| Command              | Purpose                         |
| -------------------- | ------------------------------- |
| `pnpm build`         | Build CLI only (fast, for dev)  |
| `pnpm build:release` | Build CLI + web (CI/packaging)  |
| `pnpm test`          | Run all tests                   |
| `pnpm test:unit`     | Unit tests only                 |
| `pnpm test:int`      | Integration tests only          |
| `pnpm test:e2e`      | CLI + Web e2e (Vitest + Playwright) |
| `pnpm lint:fix`      | Fix lint issues                 |
| `pnpm validate`      | lint:fix + format + typecheck + tsp (modifies files) |
| `pnpm dev:cli`       | Run CLI locally (ts-node)       |
| `pnpm dev:web`       | Start Next.js dev server        |
| `pnpm tsp:codegen`   | Compile TypeSpec + format output |
| `pnpm dev:storybook` | Start Storybook dev server       |
| `pnpm build:storybook` | Build Storybook for CI         |

**Pre-commit hooks:** Commits automatically run `pnpm generate` (TypeSpec codegen) and auto-stage generated files before lint-staged. Expect additional staged changes after commit.

**Test frameworks:** Vitest (unit/integration/CLI e2e) + Playwright (web e2e). **Node >= 22** required.

## Architecture

Clean Architecture — three core layers in `packages/core/src/`, plus presentation at repo root (dependencies point inward):

- `packages/core/src/domain/` — Core business logic, no external deps
- `packages/core/src/application/` — Use cases, output port interfaces
- `packages/core/src/infrastructure/` — External concerns: DB, agents, services
- `src/presentation/` — CLI, TUI, Web UI (separate from core package)

Repositories expose `findByIds()` and `listActive()` batch methods — prefer these over N+1 query patterns in polling and listing code.

See [clean-architecture](./docs/architecture/clean-architecture.md). Sub-directory CLAUDE.md files: `src/CLAUDE.md` (cross-platform rules), `src/presentation/web/CLAUDE.md` (web dev/prod modes, SSE architecture).

### Decomposed Services (Phase 3)

Several former god classes are now **facades** delegating to focused sub-services. Don't add logic to the facade — find the right sub-service:
- `InteractiveSessionService` → SessionStateManager, SessionBootSequence, TurnExecutor, ChatStateBuilder, SubscriberNotifier
- `GitPrService` → BranchDiscoveryService, PrCreationService, DiffAnalyzerService, CiStatusService, MergeStrategyService
- `FeatureCreateDrawer` → PromptSection, WorkflowOptionsSection, ParentFeatureCombobox, RepositoryCombobox + useFeatureCreateForm hook

### DI Registration Patterns

- **Services:** `container.registerSingleton<IInterface>('StringToken', ImplClass)` in `packages/core/src/infrastructure/di/modules/services.module.ts` — resolved by string token
- **Use cases:** `container.registerSingleton(UseCaseClass)` in `use-cases.module.ts` — resolved by class constructor token (no string token)
- **New ports:** Must add barrel export to `packages/core/src/application/ports/output/services/index.ts`
- **Server actions:** Use `resolve<T>('StringToken')` from `@/lib/server-container` — never import services directly
- **ISettingsReader pattern:** For converting global accessor calls (`getSettings()`/`hasSettings()`) to DI: class-based consumers get `@inject('ISettingsReader')` constructor injection; free-function consumers accept optional `Settings` parameter with callers injecting. Registered as `container.registerSingleton<ISettingsReader>('ISettingsReader', SettingsReaderService)`.
- **Services with non-injectable constructor deps:** When a service takes a function (e.g., `SpawnFunction`) instead of an interface, register with `useFactory` in `services.module.ts`. See `IPluginMarketplaceService` registration for the `execFile` wrapper pattern. Include `windowsHide: true` for Windows subprocess calls.

### Adding Feature Flags

Adding a field to `FeatureFlags` in TypeSpec generates a **required** (not optional) field, cascading to ~18 files:
1. `tsp/domain/entities/settings.tsp` — add field with default
2. `packages/core/src/domain/generated/output.ts` — `pnpm tsp:codegen`
3. `packages/core/src/domain/factories/settings-defaults.factory.ts` — add default value
4. SQLite migration — add `feature_flag_<name> INTEGER DEFAULT 0` column
5. `settings.mapper.ts` — SettingsRow + toDatabase + toDomain
6. `src/presentation/web/lib/feature-flags.ts` — FeatureFlagsState + ENV_FALLBACK_FLAGS + getFeatureFlags() + deprecated getter
7. `feature-flags-settings-section.tsx` — toggle row + fallback object
8. All 8 `translations/*/web.json` — label + description keys
9. Stories and tests constructing FeatureFlags objects (grep for `reactFileManager:` to find all)
10. `sqlite-settings.repository.ts` — INSERT column list + VALUES list + UPDATE SET clause (see Settings Repository SQL Sync below)

### Settings Repository SQL Sync (CRITICAL)

When a migration adds columns to the `settings` table, THREE files must be updated:
1. `settings.mapper.ts` — `SettingsRow` interface + `toDatabase()` + `toDomain()`
2. `sqlite-settings.repository.ts` — INSERT INTO column list + VALUES list
3. `sqlite-settings.repository.ts` — UPDATE SET clause

**Gotcha:** `load()` uses `SELECT *` so reads work even with missing columns. But INSERT/UPDATE enumerate columns explicitly — SQLite silently ignores extra named parameters from `toDatabase()` that aren't in the SQL. Settings appear to save (no error) but revert on reload. Always verify column parity across all three files.

### Tool Metadata System

- Tool JSON files in `packages/core/src/infrastructure/services/tool-installer/tools/` are auto-discovered by filename (no registration needed)
- `tags` field is a strict TypeScript union: `('ide' | 'cli-agent' | 'vcs' | 'terminal' | 'shell')[]` — adding new tags requires updating the `ToolMetadata` interface in `tool-metadata.ts`
- Schema documented in `tools/CLAUDE.md` — follow it exactly for new tool definitions
- Helpers: `getIdeEntries()`, `getTerminalEntries()`, `getShellEntries()` filter by tag

### Adding New Agent Types

Adding a new CLI agent requires changes across 8+ integration points:

1. `tsp/common/enums/agent-config.tsp` — Add to `AgentType` enum; add a new permission enum in `tsp/common/enums/agent-permissions.tsp`, run `pnpm tsp:codegen`
2. `packages/core/.../tool-installer/tools/<id>.json` — Tool metadata (auto-discovered by filename)
3. `packages/core/.../executors/<name>-executor.service.ts` — Extend `ExecutorBase`
4. `packages/core/.../agent-executor-factory.service.ts` — Update `createExecutor`, `getSupportedAgents`, `getCliInfo`, `getSupportedModels`, `supportsInteractive`
5. `packages/core/.../agent-validator.service.ts` — Add to `AGENT_BINARY_MAP`
6. `packages/core/.../di/modules/agents.module.ts` — Register `IAgentSessionRepository` (use `StubSessionRepository` for new agents)
7. `src/presentation/web/app/actions/check-agent-auth.ts` — `AGENT_LABELS`, `AGENT_TOOL_MAP`, `AGENT_BINARY_MAP`, `tier1AuthCheck`, `tier2AuthVerify`
8. `src/presentation/web/app/actions/check-agent-tool.ts` — `AGENT_TOOL_MAP`, `AGENT_BINARY_MAP`
9. `src/presentation/web/app/actions/get-all-agent-models.ts` — `AGENT_LABELS`, `AGENT_ORDER`, `AGENT_TOOL_IDS`
10. `.storybook/mocks/app/actions/get-all-agent-models.ts` + `check-agent-tool.ts` — Mock data

**Gotcha — duplicate agent maps:** `AGENT_LABELS` and `AGENT_BINARY_MAP` exist in BOTH `check-agent-auth.ts` AND `check-agent-tool.ts` (with inconsistent values for cursor). Update all copies.

**Gotcha — `tier2AuthVerify` mixed pattern:** Cases that set `cmd`/`args` use `break` (falling through to shared `execFile`). Cases that resolve directly MUST use `return` (not `break`) or `cmd`/`args` will be uninitialized.

**Gotcha — `dev` agent removed (spec 082):** `AgentType.Dev` was removed from the TypeSpec enum and all call sites. The mock executor (`SHIPIT_AI_MOCK_EXECUTOR=1`) is a separate system and still works. Do not re-add dev-specific branches.

### Per-Agent Permission Mode Resolution

`resolveAgentPermissionMode(settings?, agentType?)` in `packages/core/src/infrastructure/services/agents/common/agent-permissions.ts`. Precedence: CLI override > feature row > per-agent setting > `DEFAULT_MODE_BY_AGENT`. When adding a new agent, add a default to this map.

**Agent CLI flag semantics (non-obvious):**
- **Cursor CLI:** `--force` is required for file writes in `-p` print mode. `--yolo` alone only auto-approves shell commands. Both `--yolo` AND `--force` needed for full batch autonomy.
- **Copilot CLI:** `--yolo` decomposes to `--allow-all-tools + --allow-all-paths + --allow-all-urls` (three sub-flags combined).
- **Gemini CLI:** 3 open upstream bugs (#13561, #19774, #16012 on `google-gemini/gemini-cli`) cause hangs in `-p` mode even with `--approval-mode yolo`. ShipIT cannot work around these — document as known limitation.
- **Rovo Dev:** `--shadow` flag is referenced in plans but NOT in upstream docs at `support.atlassian.com`. Verify via `acli rovodev run --help` before relying on it.

### Presentation Layer Boundaries

- Infrastructure utilities accessed via `src/presentation/web/lib/core-utils.ts` (re-exports `isProcessAlive`, `computeWorktreePath`, `getShipitAiHomeDir`, `createDeploymentLogger`, `IS_WINDOWS`)
- Settings reads use `resolve<LoadSettingsUseCase>('LoadSettingsUseCase')` via DI — never import `getSettings()` directly
- `dev-server.ts` is bootstrap code — direct infrastructure access is correct there

### Web UI Design System

- **Editorial design system (Stitch refresh):** Design tokens in `globals.css` use Stitch's editorial palette (midnight/sky/surface). Utility classes `.editorial-shadow` and `.glass-blur` in `globals.css`. Sidebar active state via `[data-sidebar='menu-button'][data-active='true']` CSS selector. Tab active state via `[data-editorial='true'] > [role='tab'][data-state='active']`. Chat FAB open state via `[data-chat-fab='true'][data-chat-open='true']`. All state-dependent styling uses CSS attribute selectors (not conditional classNames) to prevent hydration mismatches.
- **BaseDrawer overrides DrawerContent:** `BaseDrawer` component passes its own `className` to `DrawerContent`. Any default styling set in `DrawerContent` (e.g., glass-blur) is overridden by BaseDrawer's explicit className. When changing drawer appearance, update BOTH files.
- **BaseDrawer API:** Accepts `open: boolean` and `onClose: () => void` (NOT `onOpenChange`). Differs from Radix's `Drawer` API. Uses `i18n.dir()` for RTL support — mock `useTranslation` must return `{ t, i18n: { dir: () => 'ltr' } }` in tests.
- **`@cubone/react-file-manager` dark mode:** Requires nuclear `& * { color: var(--color-foreground) !important; }` override in `.shipit-ai-file-manager` scope. The library's CSS uses hardcoded `#fff` backgrounds and `#000` text with specificity that beats wrapper-scoped selectors. Key missing selector in previous attempts: `.folders-preview` (the main file list pane).

## Security

- All web API routes go through localhost-only proxy (`src/presentation/web/proxy.ts`) — rejects non-localhost requests
- File-serving routes use `realpath()` before path containment checks to prevent symlink traversal
- Upload routes block `.env` files and extensionless files
- 500 errors use `apiError()` from `@/lib/api-helpers` — never expose raw `error.message` to clients

## Tooling

- **DI:** tsyringe (constructor injection with decorators)
- **Workspace root devDeps:** Use `pnpm add -Dw <pkg>` (with `-w` flag) when adding to the root `package.json`. Without `-w`, pnpm errors out in the monorepo. Use `pnpm --filter @shipit-ai/<workspace> add <pkg>` for workspace-scoped deps.
- **Next.js stale dev state:** If `pnpm dev:cli ui` fails with "Another next dev server is already running" referencing a dead PID, delete `src/presentation/web/.next` to clear Next's cached process state.
- **pnpm patches:** Use `pnpm patch <pkg> → edit file → pnpm patch-commit <dir>` to create patches. Never hand-write patch files or edit node_modules directly — the lockfile won't match and CI fails with `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`. Always commit `pnpm-lock.yaml` alongside patch changes.
- **pnpm outdated blind spot:** Only shows ROOT-declared deps. Transitive security pins via `pnpm.overrides` (e.g. `"@rushstack/node-core-library>ajv": "^8.18.0"`, `"@anthropic-ai/sdk": "^0.81.0"`) are invisible — always cross-check `pnpm-lock.yaml` and `git log --oneline --grep='fix(deps)'` before assuming a dep is un-patched.
- **Security overrides are scoped, not blanket:** Use `"parent>child": "^x.y.z"` syntax to patch only the vulnerable subtree. A blanket `"ajv": "^8.18.0"` breaks `@eslint/eslintrc` which needs ajv 6.x (different API). Preserve the scope when widening.
- **TypeSpec patch peer warning is benign:** `pnpm add` always shows `unmet peer @typespec/compiler@^0.59.1: found 1.10.0` from `@typespec-tools/emitter-typescript@0.3.0` — pnpm reads the pre-patch manifest. The patch updates the peerDep to `^1.0.0`. Ignore this specific warning.
- **Lint-staged is parallel-session safe:** When committing a subset of modified files via `git add <path>` while other files are unstaged, the pre-commit hook's lint-staged creates a backup stash, runs formatters ONLY on staged files, then restores the stash. Unstaged work in other files is preserved untouched. Safe to commit your slice without coordinating with parallel agents.
- **`format:check` CI vs local:** Pre-commit hooks run `prettier --write` on staged files only. CI runs `pnpm format:check` on the entire project. A file modified by a background agent but not re-staged can pass pre-commit but fail CI. Run `pnpm format:check` before pushing if agents modified files.
- **Security alert APIs split by tool:** Dependabot uses GraphQL `repository.vulnerabilityAlerts` (works with `repo` scope); code scanning (CodeQL) uses REST `gh api 'repos/OWNER/REPO/code-scanning/alerts?state=open'` (also `repo` scope). The REST `/dependabot/alerts` endpoint requires `admin:repo_hook` — avoid it. Admin ops may require switching to `jrmatherly` via `gh auth switch --user jrmatherly`.
- **CodeQL taint boundary:** `js/path-injection` and similar queries stop taint propagation at DB reads (e.g. `featureRepo.findById()`). A file with a structurally identical sink to a flagged file may be missed because its taint source flows through a DB lookup. When auditing alert coverage, trace the source manually — don't assume "not flagged = safe".
- **CodeQL inline suppression does NOT work with GitHub default setup:** `// codeql[query-id]` and `// lgtm[query-id]` comments are recognized by the CodeQL CLI's `AlertSuppression.ql` query but GitHub's code scanning pipeline does NOT run that query. Maintainer Arthur Baars confirmed on github/codeql#9298: *"Alert suppression using //lgtm or otherwise is not supported by GitHub Code Scanning."* Issue closed as "not planned." The ONLY supported ways to suppress false positives are: (1) REST API dismissal `gh api --method PATCH repos/OWNER/REPO/code-scanning/alerts/N -f state=dismissed -f dismissed_reason='false positive' -f dismissed_comment='...'` (max 280 chars), (2) GitHub UI dismissal, (3) fixing the code so taint analysis no longer flags it. Do NOT add inline `// codeql[...]` comments — they are dead code that falsely implies suppression. Use `// SECURITY:` prefix instead for human-readable rationale documenting dismissed alerts.
- **CodeQL does not model custom sanitizer functions:** CodeQL's `js/command-line-injection` and `js/path-injection` only recognize sanitizers registered via `ModelOutput::barrierNode()` in model packs or as framework-specific classes like `QuotingConcatSanitizer`. Custom helpers like `shellEscapePosixPath` or `realpathOrNull` wrappers are treated as opaque function calls — taint flows through them. `shell-quote` npm package is NOT modeled (confirmed via CodeQL source audit: zero references in `javascript/ql/lib/semmle/javascript/frameworks/`, no `ShellQuote.qll`). Replacing custom escape functions with `shell-quote` will NOT close command-injection alerts.
- **Custom CodeQL model packs can't reference local files:** `.github/codeql/extensions/*/barriers.model.yml` with `barrierModel` tuples works with default setup for JavaScript, BUT the `type` column only accepts npm package names or `"global"` — not file paths. Project-local sanitizer functions in `src/presentation/web/lib/path-sanitizers.ts` cannot be modeled as barriers without publishing them as an npm package.
- **cursor.com behind Vercel bot challenge:** WebFetch and curl both get challenged by Vercel's bot protection on `cursor.com`. Use WebSearch instead to retrieve cached/indexed content from the Cursor docs.
- **Validate CI-enforced rules locally against the exact input:** When a pre-commit hook or CI check rejects something, pipe the exact input through the tool directly: `cat /tmp/commit-msg.txt | npx --no-install commitlint`, `cat file.ts | npx eslint --stdin`, `echo "$SQL" | sqlfluff lint -`. Guessing-and-retrying is 3× slower and pollutes git history with `--amend` noise. Applies to commitlint, eslint, prettier, markdownlint, codeql, semgrep, trivy — anything with a CLI entry point.
- **Subagent research needs empirical verification for dual-system claims:** When a subagent reports "feature X works" and the feature spans two systems (tool vs pipeline, SDK vs service, CLI vs hosted), verify empirically before acting. Example: a subagent correctly found `// codeql[query-id]` regex in CodeQL's `AlertSuppression.qll` and concluded it works with GitHub code scanning — wrong, GitHub's pipeline doesn't run the suppression query. Independent subagents with claims bounded to one system (shell-quote audit, model-pack audit) reached correct conclusions. **Rule:** if a subagent claim touches system boundaries, test it before committing code that depends on it.
- **Serena MCP:** Onboarded — use for semantic symbol navigation, find references, code overview
- **Code Review Graph:** Built — use for impact analysis, flow tracing, PR review context
- **IDE workflow linter:** `secrets.*` and dynamic `env.*` (set via `$GITHUB_ENV`) references in GitHub Actions workflows show "context access might be invalid" — these are false positives from static analysis.
- **Bulk rename:** For project-wide text replacements, use `git grep -l 'old' -- ':!node_modules/' | while read f; do perl -pi -e 's/old/new/g' "$f"; done` — faster and safer than `sed` on macOS.
- **Radix Tooltip controlled mode gotcha:** Passing `open={undefined}` puts Radix Tooltip in controlled mode because `'open' in props` is `true`. To conditionally control: use spread `{...(isOpen ? { open: false } : {})}` so the prop key is absent when uncontrolled.
- **`hover:-translate` breaks Radix Tooltip:** CSS `hover:-translate-y-*` physically moves the element, causing pointer leave/enter flapping that cancels Radix's hover timer. Use `hover:scale-[1.05]` instead for FABs and floating buttons.
- **Tailwind v4 opacity modifier on CSS-variable colors:** `bg-card/85` may not resolve when `--color-card` is a raw hex. Use 8-digit hex instead: `bg-[#1e293bd9]` (where `d9` = 85% opacity).
- **`dark:invert` destroys brand-colored SVG icons:** simpleicons CDN serves pre-colored SVGs. Never apply `dark:invert` to `<img>` elements loading branded tool icons — they should render identically in both modes.
- **CSS attribute selectors for hydration-safe state styling:** Pattern: `[data-sidebar='menu-button'][data-active='true'] { @apply text-primary ... }` in globals.css. Conditional classNames derived from `usePathname()` cause hydration mismatches; move state-dependent styling to CSS targeting data attributes instead.

## CI Patterns

- **Idempotent PR comments:** Use `peter-evans/find-comment@v4` + `create-or-update-comment@v5` with hidden HTML marker (`<!-- tag -->`) and `comment-id` + `edit-mode: replace`. The `comment-tag` input does NOT exist on this action.
- **Concurrency:** All workflows use `concurrency: group: ${{ github.workflow }}-${{ github.ref }}` with `cancel-in-progress: true`. New pushes cancel stale runs on all branches including main.

## CI/CD Publishing

- **npm publishing:** Uses OIDC trusted publishing (no NPM_TOKEN). Requires `id-token: write` permission. Provenance is automatic with OIDC — do NOT add `--provenance` flag. Trusted publisher configured on npmjs.com for `jrmatherly/shipit` → `ci.yml`.
- **Node 24 for publish jobs:** OIDC requires npm >= 11.5.1. Node 22 ships npm 10.x (too old). Release and Dev Release jobs use `node-version: '24'`. Do NOT try `npm install -g npm@latest` — npm 10 can't bootstrap npm 11.
- **No registry-url in Release job:** `registry-url` in setup-node creates an `.npmrc` that conflicts with semantic-release's OIDC auth (causes ENEEDAUTH). Only the Dev Release job (direct `npm publish`) uses `registry-url`.
- **Slack plugin:** `@timebyping/semantic-release-slack-bot` conditionally loaded in `release.config.mjs` only when `SLACK_WEBHOOK` env var is set. Currently disabled (no Slack workspace).
- **Branch protection:** main branch has 11 required status checks, force push blocked, deletion blocked. `enforce_admins: false` so `RELEASE_TOKEN` PAT can push release commits.
- **Releases:** `RELEASE_TOKEN` (fine-grained PAT) required for semantic-release to push version commits. Scoped to `jrmatherly/shipit` with contents:write, issues:write, pull-requests:write.
- **Version tags:** If semantic-release resets to v1.0.0, it means no git tags exist. Create a tag matching the published npm version: `git tag v<version> && git push origin v<version>`.
- **gh CLI accounts:** Two accounts configured — `jrmatherly` (repo owner, needed for admin ops like deleting workflow runs) and `Jason-Matherly_aarons` (default active). Switch with `gh auth switch --user <name>`, always switch back after admin ops.

## Rules

Additional rules auto-loaded from `.claude/rules/`: [cicd.md](.claude/rules/cicd.md), [code-quality.md](.claude/rules/code-quality.md), [commit-conventions.md](.claude/rules/commit-conventions.md), [cross-platform.md](.claude/rules/cross-platform.md), [integrity.md](.claude/rules/integrity.md), [operational-discipline.md](.claude/rules/operational-discipline.md).

## Cross-Document Consistency

CLAUDE.md is the canonical reference. When updating commands, paths, scopes, or rules here, also update:
- `AGENTS.md` — generic agent instructions (`CURSOR.md` symlinks here)
- `CONTRIBUTING.md` — human contributor guide (Node version, pnpm version, directory paths)
- `CONTRIBUTING-AGENTS.md` — AI agent contributor guide (commit scopes, directory paths, co-author line)
- `.serena/memories/` — Serena onboarding memories (commands, checklist)
- `docs/FEATURES.md` — user-facing features guide (CLI command examples)
- `docs/development/shipit-kit-reference.md` — skills toolkit reference

## Mandatory Rules

- **MANDATORY — TDD**: Write failing tests FIRST (RED → GREEN → REFACTOR). Every plan phase must define explicit TDD cycles. See [tdd-guide](./docs/development/tdd-guide.md).
- **MANDATORY — TypeSpec-first**: Domain models defined in `tsp/`. Run `pnpm tsp:codegen` to generate `packages/core/src/domain/generated/output.ts`. Never edit generated files. Emitter (`@typespec-tools/emitter-typescript@0.3.0`) is abandoned and patched via `patches/@typespec-tools__emitter-typescript@0.3.0.patch` to (1) map `utcDateTime`/`offsetDateTime`/`plainDate`/`plainTime` → `Date` and `duration` → `string`, (2) swap imports from `@typespec/compiler/emitter-framework` (removed in TypeSpec 1.0) to `@typespec/asset-emitter@0.79.0`, and (3) update peerDep to `@typespec/compiler ^1.0.0`. **Gotcha:** `tsp/main.tsp` declares `namespace ShipitAI.Domain;` at file-bottom AFTER imports, so all imported models live in the empty-string global namespace — any emitter that requires a named root namespace (e.g. crowbait's `typespec-typescript-emitter`) will fail to find our types. See [typespec-guide](./docs/development/typespec-guide.md).
- **MANDATORY — Agent resolution**: No component may hardcode an agent type. All resolution flows through `IAgentExecutorProvider`. See [AGENTS.md](./AGENTS.md).
- **MANDATORY — Storybook stories**: Every web UI component MUST have a colocated `.stories.tsx` file. Not yet enforced by pre-commit hooks — self-enforce.
- **MANDATORY — Spec-driven**: All features start with `/shipit-kit:new-feature`. No implementation without a spec.
- **MANDATORY — Own every failure**: You are the ONLY developer. Every test failure, CI failure, and security scan failure is YOUR responsibility. NEVER use the words "unrelated", "pre-existing", or "not our changes". See [integrity rules](./.claude/rules/integrity.md).

## Commit Format

[Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <subject>`

| Types | feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert |
| Scopes (recommended) | specs, shipit-kit, cli, tui, web, api, domain, agents, deployment, tsp, deps, config, dx, release, ci |

Scopes are enforced at warning level by commitlint — commits succeed but prefer using listed scopes.

## Key Docs

| Topic                          | Doc                                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| Architecture overview          | [docs/architecture/overview.md](./docs/architecture/overview.md)                       |
| Domain models + field listings | [docs/api/domain-models.md](./docs/api/domain-models.md)                               |
| Repository pattern + DI        | [docs/architecture/repository-pattern.md](./docs/architecture/repository-pattern.md)   |
| Agent system                   | [docs/architecture/agent-system.md](./docs/architecture/agent-system.md)               |
| Settings service               | [docs/architecture/settings-service.md](./docs/architecture/settings-service.md)       |
| TypeSpec guide                 | [docs/development/typespec-guide.md](./docs/development/typespec-guide.md)             |
| Testing guide                  | [docs/development/tdd-guide.md](./docs/development/tdd-guide.md)                       |
| Implementation patterns        | [docs/development/implementation-guide.md](./docs/development/implementation-guide.md) |
| CI/CD + Docker                 | [docs/development/cicd.md](./docs/development/cicd.md)                                 |
| Adding agents                  | [docs/development/adding-agents.md](./docs/development/adding-agents.md)               |
| CLI architecture               | [docs/cli/architecture.md](./docs/cli/architecture.md)                                 |
| TUI architecture               | [docs/tui/architecture.md](./docs/tui/architecture.md)                                 |
| Web UI architecture            | [docs/ui/architecture.md](./docs/ui/architecture.md)                                   |
| pnpm workspaces + setup        | [docs/development/setup.md](./docs/development/setup.md)                               |
| Tech debt remediation plan     | [.scratchpad/plans/technical-debt-remediation-plan.md](./.scratchpad/plans/technical-debt-remediation-plan.md) |
| Security proxy            | [src/presentation/web/proxy.ts](./src/presentation/web/proxy.ts)              |
| Shipit-kit skills reference | [docs/development/shipit-kit-reference.md](./docs/development/shipit-kit-reference.md) |

## Naming Conventions (Post-Rename)

- npm scope: `@shipit-ai/` — binary: `shipit-ai` — data dir: `~/.shipit-ai/`
- Env vars: `SHIPIT_AI_*` prefix (e.g. `SHIPIT_AI_HOME`), Next.js: `NEXT_PUBLIC_SHIPIT_AI_*`
- TypeSpec namespace: `ShipitAI.Domain` — `@module ShipitAI.*`
- LocalStorage: `shipit-ai-*` prefix — DOM events: `shipit-ai:*` prefix
- CSS classes: `shipit-ai-*` prefix — test IDs: `data-testid="shipit-ai-*"`
- Container registry: `ghcr.io/jrmatherly/shipit`
- E2E test target repo: `jrmatherly/shipped`
- `/shipit-kit` skill name prefix — skill directories in `.claude/skills/shipit-kit-*/`

## Tech Debt

Active remediation plan: [`.scratchpad/plans/technical-debt-remediation-plan.md`](./.scratchpad/plans/technical-debt-remediation-plan.md) (74 findings across 5 dimensions). Phases 0-3 complete (security, quick wins, architecture repair, god class decomposition). Phase 4 (test coverage) in progress (6/8 done). Check the plan before starting new work that touches affected areas.

## Testing Patterns

- **Shared factories:** Use `import { createMockFeature, createMockAgentRun, createMockRepository, createMockAgentSession } from '@tests/factories/index.js'` — don't create inline mock factories
- **Settings factory:** Use `createDefaultSettings(overrides?)` from `@shipit-ai/core/domain/factories/settings-defaults.factory` — accepts optional `{ defaultEditor?, shellPreference?, terminalPreference? }` overrides for auto-detection
- **DI mocking:** Mock `@/lib/server-container` with `vi.mock('@/lib/server-container', () => ({ resolve: ... }))` for server action tests
- **TypeSpec dates:** All 31 date/timestamp fields are `Date` objects (not strings). Use `new Date('...')` in test mocks, not ISO strings.
- **Storybook server action mocks:** New server actions MUST have corresponding mocks in `.storybook/mocks/app/actions/` — Storybook aliases `@/app/actions` to this directory. Missing mocks break `pnpm build:storybook`.
- **TypeSpec toolchain bump verification:** Before any `@typespec/*`, `@typespec-tools/*`, or emitter dependency bump, capture `shasum -a 256 packages/core/src/domain/generated/output.ts`, run `pnpm tsp:codegen`, compare. Byte-identical = safe. Any diff = investigate emitter behavior change before committing.
- **State channel count assertion:** `tests/unit/infrastructure/services/agents/feature-agent/state.test.ts` has a hardcoded channel count assertion that must be bumped when adding new fields to `FeatureAgentAnnotation`. Forgetting this causes a cryptic test failure unrelated to your actual change.
- **Radix Tooltip content is portal-rendered:** Test for tooltip presence via `aria-label` on the trigger button, NOT via `screen.getByText()` on the tooltip content (which is only mounted when the tooltip is open). Example: `screen.getByRole('button', { name: /shipit ai chat/i })`.
- **reflect-metadata in use case tests:** Test files importing use cases with `@injectable()`/`@inject()` decorators must add `import 'reflect-metadata';` as the FIRST import line. The vitest node setup does not include this polyfill.
- **Storybook imports:** Use `import type { Meta, StoryObj } from '@storybook/react-vite'` — NOT `@storybook/react`. The project uses the Vite-specific Storybook package.
- **Storybook story args:** Empty callback functions in story `args` must use `() => undefined` not `() => {}` — ESLint's `@typescript-eslint/no-empty-function` rejects the latter.

### i18n Key Parity

- Translation completeness tests enforce that ALL 8 locale files (`translations/{en,ar,de,es,fr,he,pt,ru}/web.json`) have identical key sets
- Adding a key to `en/web.json` requires adding it to all 7 other locale files or tests fail

## Working Practices
### 1. Self-Improvement Loop
- After ANY correction from the user: update `LESSONS.md` (project root) with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project
- Keep lessons short and concise

### 2. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes – don't over-engineer
- Challenge your own work before presenting it
