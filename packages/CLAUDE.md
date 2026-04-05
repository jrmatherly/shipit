# Cross-Platform Rules

All code under `packages/` MUST follow the repo-wide cross-platform rules.

Canonical source: [../.claude/rules/cross-platform.md](../.claude/rules/cross-platform.md)

Covers: path handling, process spawning, line endings, temp directories, process management, file system quirks, platform detection, testing. All tests must pass on `ubuntu-latest` AND `windows-latest`.
