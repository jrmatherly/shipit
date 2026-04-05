# Session Summary — 2026-04-05 (Security Alert Remediation)

Follows `session_summary_2026_04_04_phase_cd.md`. This session handled two
back-to-back security remediation passes: Dependabot advisories on transitive
deps and CodeQL code-scanning alerts on shipit source. Then refactored the
path-sanitization pattern into a shared module after an audit found a third
inline copy (plus a latent TOCTOU).

## Commits Created (5 unpushed at session start, 1 pre-existing)

| Commit | Scope | Description |
|--------|-------|-------------|
| `c91dacaa` | deps | (pre-existing) langchain/types-node/claude-agent-sdk/asset-emitter bumps |
| `e469d7c7` | deps | (earlier — already pushed) scoped pnpm.overrides for ajv ReDoS + @anthropic-ai/sdk sandbox escape |
| `e5467f11` | web | close 26 codeql alerts across web actions and api routes |
| `106cf150` | config | extract cross-platform rules to shared rule file |
| `a6ac80be` | web | extract path sanitizers and close directory-list toctou |
| `8955768f` | config | capture security and cross-platform learnings from codeql session |

## Pass 1 — Dependabot Alerts (prior commit `e469d7c7`, already pushed)

Two moderate advisories, both transitive:

1. **GHSA-2g4f-4pwh-qvx6** (CVE-2025-69873) — `ajv` ReDoS via `$data` option.
   Vulnerable `ajv@8.13.0` pulled via `umzug → @rushstack/ts-command-line →
   @rushstack/terminal → @rushstack/node-core-library (~8.13.0)`. Zero
   exploit surface in shipit (no direct ajv use, no `$data: true` anywhere,
   and rushstack's internal Ajv construction uses only `{ strictSchema,
   allowUnionTypes }`). Remediated anyway via scoped override
   `"@rushstack/node-core-library>ajv": "^8.18.0"`.

2. **GHSA-5474-4w2j-mq4c** (CVE-2026-34451) — `@anthropic-ai/sdk@0.80.0`
   memory tool path-validation bug. Vulnerable class
   `BetaLocalFilesystemMemoryTool` is never imported by shipit or by
   `@anthropic-ai/claude-agent-sdk`. Remediated via
   `"@anthropic-ai/sdk": "^0.81.0"` override.

**Key lesson: scoped vs blanket overrides.** A blanket `"ajv": "^8.18.0"`
override breaks `@eslint/eslintrc` which depends on ajv 6.x (different API
shape). Must use `"parent>child": "^x.y.z"` syntax. Captured in CLAUDE.md.

## Pass 2 — CodeQL Alerts (commit `e5467f11`)

26 open alerts grouped into 7 clusters:

| Cluster | Severity | Count | Fix summary |
|---|---|---|---|
| A: js/command-line-injection | CRIT | 2 | `open-shell.ts` — POSIX shell-escape `{dir}` for `shell:true` tools, argv-element substitution for non-shell tools |
| B: js/path-injection | HIGH | 8 | 5 files: replace `existsSync(userPath)` with `realpathSync(path)` up-front; add containment helpers; close TOCTOU in upload-from-path |
| C: js/polynomial-redos | HIGH | 1 | `create-feature.use-case.ts` — replace `/\/+$/` regex with bounded while loop (CodeQL false positive; V8 handles anchored `+` as O(n)) |
| D: js/incomplete-sanitization | HIGH | 1 | `github-repository.service.ts` — `JSON.stringify` for jq string literal; regex `test()` → `ascii_downcase` + `contains()` |
| E: js/stack-trace-exposure | MED | 4 | 4 SSE/API routes — `new Response(JSON.stringify({error: String(error)}))` → `apiError(500, ...)` from `@/lib/api-helpers` |
| F: actions/missing-workflow-permissions | MED | 8 | `ci.yml` + `pr-check.yml` — top-level `permissions: {}` deny-all + per-job `contents: read` |
| G: js/shell-command-injection-from-environment | MED | 2 | `tests/helpers/cli/runner.ts` — switched from shell-form sync spawn to argv-form sync spawn via `child_process.execFileSync`; added quote-aware `parseArgs` tokenizer; `resolveRunnerBinary()` returns `npx.cmd` on Windows |

**Key lesson: Windows `npx.cmd` resolution.** The argv-form sync spawner does
NOT auto-resolve `.cmd` shims without `shell: true`. Must pick the binary
explicitly per platform. Captured in `.claude/rules/cross-platform.md`.

**Key lesson: `JSON.stringify` as jq string builder.** JSON string literals
are a strict subset of jq string literals, so any JSON-encoded string is
simultaneously valid jq — bypasses the entire class of hand-rolled escape
bugs in regex-based jq filters.

## Code Review Cycle

Dispatched `superpowers:code-reviewer` subagent after Pass 2. Findings:

- **C1** (Windows `npx.cmd`): real regression for local dev on Windows —
  FIXED with `resolveRunnerBinary`.
- **C2** (`deploy-feature.ts` twin): verified NOT in CodeQL alert list
  because taint analysis stops at DB boundary (`findById`). Out of scope
  per the operational-discipline rule; noted as defense-in-depth follow-up.
- **I1** (e2e tests with quoted args): `parseArgs` needed a quote-aware
  tokenizer to support existing callers like
  `runner.run(\`feat new "Add user authentication" --repo ${tempRepo}\`)`.
  Implemented, plus 11 new unit tests.
- **I3** (`/api/evidence` route): found the reviewer was right AND a
  related bug I'd introduced — `normalizeEvidencePaths` was returning
  realpath'd paths that wouldn't match the evidence route's unresolved
  prefix on macOS. Reverted the realpath and added explanatory comments.
- **I4** (workflow-level `permissions: {}`): added deny-all defaults to
  both workflows so future jobs fail-secure.
- **M5** (ReDoS comment overstated risk): reworded to clearly mark as
  CodeQL false-positive workaround.

## Pass 3 — Deferred Item Audit & Path Sanitizers Refactor (commit `a6ac80be`)

Rather than accepting the reviewer's "deferred" labels at face value,
audited each:

- **I2 (double-realpath perf)**: audit confirmed perf impact negligible
  but uncovered a TOCTOU angle — re-realpath'ing an already-resolved root
  opens a window where filesystem state can change. FIXED by splitting
  `realpathWithinRoot` into two primitives.

- **M2 (extract helpers)**: audit invalidated the "two instances" count.
  Found THREE inline copies (`get-merge-review-data.ts`,
  `upload-from-path/route.ts`, `directory/list/route.ts`), crossing
  CLAUDE.md's "three instances = must extract" threshold. Plus discovered
  `directory/list/route.ts` had the same TOCTOU pattern
  `upload-from-path` had before its Pass 2 fix — `stat`/`readdir` running
  against un-realpath'd `resolvedPath`. CodeQL didn't flag it because its
  taint tracking doesn't follow that flow.

- **N3 (unused sep branch)**: two-platform case analysis proved the
  `startsWith(root + sep)` third clause was strictly unreachable on both
  POSIX (inputs string-identical to clause 2) and Windows (both sides
  go through `/\\/g → '/'` normalization before prefix check).

All three resolved by one refactor: new `src/presentation/web/lib/path-sanitizers.ts`
with `realpathOrNull`, `isWithinRoot`, `realpathWithinAllowedRoots`, and
their async variants. Three call sites migrated. `directory/list` TOCTOU
closed as a bonus.

**Key pattern: display-vs-physical path split.** Routes that return paths
to clients AND use realpath internally must keep `displayPath` (user-typed,
response payload) separate from `physicalPath` (realpath-sanitized, all
filesystem sinks). Same pattern the reviewer caught in `get-merge-review-data`
with the `/api/evidence` route's unresolved-prefix check. Captured in
`src/presentation/web/CLAUDE.md` as a Path Containment section.

## Test Results

Every checkpoint between commits:

- `pnpm typecheck` — 0 errors
- `pnpm lint` — 0 warnings (`--max-warnings 0`)
- `pnpm test:unit` — 398 files / 5,732 tests after Pass 2, **399 files / 5,755 tests** after refactor (+36 net-new tests this session)
- `pnpm test:int` — 50 files / 578 tests (+ 1 pre-existing expected fail)
- `pnpm build` — CLI build successful
- E2E spot checks: `install-command.e2e.test.ts` (12/12) and `feat.test.ts` (11/11) under `SHIPIT_AI_E2E_USE_DIST=1`, validating the full argv-form spawn + `parseArgs` quote-tokenizer roundtrip

## Documentation Captured This Session

- Root `CLAUDE.md` (Tooling): security alert APIs split (Dependabot GraphQL
  vs CodeQL REST), CodeQL taint boundary at DB reads.
- `src/presentation/web/CLAUDE.md` (new section): Path Containment policy,
  display-vs-physical path split pattern, canonical `path-sanitizers.ts`
  helper.
- `.claude/rules/cross-platform.md` (Process Spawning): argv-form spawn
  plus `.cmd` shim foot-gun on Windows, reference to `resolveRunnerBinary`
  pattern.
- Cross-platform rules deduplicated into `.claude/rules/cross-platform.md`
  (commit `106cf150`), with `src/CLAUDE.md` and `packages/CLAUDE.md`
  collapsed to pointers.

## Code Review Graph

Rebuilt with `base: c91dacaa` after incremental-mode only picked up the
3 markdown files from the last commit. Stats after rebuild:

- Files: 1,491 (+3)
- Nodes: 12,927 (+52)
- Edges: 132,403 (+398)
- New Function nodes: +5 (realpathOrNull, isWithinRoot,
  realpathWithinAllowedRoots, realpathOrNullAsync,
  realpathWithinAllowedRootsAsync — plus resolveRunnerBinary,
  shellEscapePosixPath, resolveTargetPath)
- New Test nodes: +44 (parseArgs suite + path-sanitizers suite + 2
  security regression tests)

All new symbols verified findable via `semantic_search_nodes_tool`.

## Key Lessons Captured

1. **Audit deferred items, don't trust them blindly.** All three of the
   reviewer's "minor/low-priority" items turned out to have real issues
   when I looked: I2 had a TOCTOU angle, M2's count was wrong, N3 was
   actual dead code. Every deferred item got addressed.

2. **TOCTOU patterns are reproducible.** Once one file had the
   `realpath-then-use-the-unresolved-path` bug, others in the codebase
   had the same bug. Extract shared helpers FAST when you find a pattern
   — inline copies accumulate latent duplicates of the same defect.

3. **CodeQL taint analysis has a DB boundary.** Useful when auditing
   alert coverage: "is this a CodeQL miss or an out-of-scope case?"
   is answered by tracing whether the taint source flows through a
   DB read.

4. **Scoped pnpm overrides > blanket overrides.** Blanket `"ajv": "^8.18"`
   breaks eslintrc's ajv 6.x branch; scoped `"parent>child": "^8.18.0"`
   surgically patches only the vulnerable subtree.

5. **Security fix commit type matters for release delivery.** Using
   `fix(deps)` vs `chore(deps)` determines whether semantic-release
   cuts a patch release. A "chore" commit means users don't actually
   receive the fix until the next "fix" or "feat" commit ships.

## Current State (end of session)

- `@shipit-ai/cli@1.166.1` on npm (from prior session's Dependabot fix).
- 5 unpushed commits on `main`, queued for `1.166.2` on push:
  `c91dacaa` (deps), `e5467f11` (web fix), `106cf150` (docs refactor),
  `a6ac80be` (web fix), `8955768f` (docs knowledge capture).
- All local validation green. CI/push pending.
- 26 CodeQL alerts expected to auto-close on next scan post-push.

## Remaining Work (updated from prior session)

- Push the 5 queued commits to trigger 1.166.2 release.
- P4-4: Test 18 CLI commands (16h) — unchanged.
- P4-6: E2E tests for critical user journeys (16h) — unchanged.
- Defense-in-depth follow-up: apply the same realpath sanitization pattern
  to `deploy-feature.ts` (structurally identical to `deploy-repository.ts`
  but not currently CodeQL-flagged because taint stops at DB boundary).
- Agent label consolidation (tech debt, unchanged).
