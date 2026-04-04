# Feature: shipit-kit

> Spec-driven development workflow for Shipit AI contributors

## Status

- **Number:** 001
- **Created:** 2026-02-02
- **Branch:** feat/001-shipit-kit
- **Phase:** Complete
- **Merged:** 2026-02-02

## Problem Statement

Contributors need a standardized, enforced workflow for starting feature work. Without a structured approach:

- Requirements are unclear or missing
- Implementation starts before design is validated
- Dependencies between features are discovered too late
- Knowledge is lost when contributors change

Shep-kit provides a spec-driven workflow (inspired by GitHub's SpecKit) that mandates specification before implementation.

## Success Criteria

- [x] `/shipit-kit:new-feature` skill creates branch + spec directory with templates
- [x] `/shipit-kit:research` skill guides technical decision documentation
- [x] `/shipit-kit:plan` skill creates implementation plan with task breakdown
- [x] All template files scaffold correctly via init script
- [x] Agent infers affected areas, dependencies, and size from codebase analysis
- [x] Existing specs are scanned to discover feature dependencies
- [x] Documentation (CONTRIBUTING, CLAUDE.md, etc.) mandates this workflow
- [x] `docs/development/spec-driven-workflow.md` serves as single source of truth

## Affected Areas

| Area                     | Impact | Reasoning                                      |
| ------------------------ | ------ | ---------------------------------------------- |
| `.claude/skills/`        | High   | New shipit-kit skill directory with 3 skills     |
| `specs/`                 | High   | New root-level directory for all feature specs |
| `docs/development/`      | High   | New spec-driven-workflow.md guide              |
| `CONTRIBUTING.md`        | Medium | Add mandatory workflow section                 |
| `CONTRIBUTING-AGENTS.md` | Medium | Add mandatory workflow section                 |
| `CLAUDE.md`              | Medium | Reference specs/ and shipit-kit commands         |
| `README.md`              | Low    | Brief spec-driven development section          |
| `AGENTS.md`              | Low    | Link specs to agent workflow                   |

## Dependencies

<!-- None - this is the first spec -->

None identified. This is the foundational workflow spec.

## Size Estimate

**L** - Multiple skills, templates, scripts, and documentation updates across 8+ files. Core infrastructure for all future development.

## Open Questions

- [x] Should `/shipit-kit:validate` be implemented in initial release or deferred?
- [x] Should `/shipit-kit:status` and `/shipit-kit:continue` be implemented initially?

## Decision

Implement core skills only (`new-feature`, `research`, `plan`). Optional skills (`status`, `continue`, `validate`) deferred to future iteration based on real usage.

---

_Feature complete. Merged via PR #3._
