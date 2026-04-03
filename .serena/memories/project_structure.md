# Project Structure

```
shipit/
├── CLAUDE.md              # AI assistant instructions
├── AGENTS.md              # Agent system documentation
├── LESSONS.md             # Self-improvement lessons
├── package.json           # Root package + CLI entry
├── pnpm-workspace.yaml    # Workspace config
├── tsconfig.json          # TypeScript config (path aliases)
├── tsconfig.build.json    # Build-specific TS config
├── vitest.config.ts       # Test configuration
├── playwright.config.ts   # E2E web test config
├── eslint.config.mjs      # ESLint flat config
├── commitlint.config.mjs  # Commit message validation
├── release.config.mjs     # semantic-release config
├── Dockerfile             # Container build
│
├── packages/
│   └── core/              # @shipit-ai/core — business logic
│       └── src/
│           ├── domain/        # Layer 1: entities, value objects, generated models
│           ├── application/   # Layer 2: use cases, ports, services
│           └── infrastructure/# Layer 3: DI, repos, persistence, services
│
├── src/
│   └── presentation/      # Layer 4: UI/UX
│       ├── cli/           # CLI commands
│       ├── tui/           # Terminal UI
│       └── web/           # Next.js web app (@shipit-ai/web)
│
├── tsp/                   # TypeSpec definitions → generates domain models
│   ├── main.tsp
│   ├── domain/            # Domain model specs
│   ├── agents/            # Agent-related specs
│   ├── common/            # Shared TypeSpec types
│   ├── deployment/        # Deployment model specs
│   └── ui/                # UI model specs
│
├── tests/
│   ├── unit/              # Unit tests (vitest)
│   ├── integration/       # Integration tests (vitest)
│   ├── e2e/               # E2E tests (vitest CLI + playwright web)
│   ├── fixtures/          # Test fixtures
│   ├── helpers/           # Test helpers
│   └── manual/            # Manual test suites
│
├── specs/                 # Feature specifications (YAML → MD)
├── scripts/               # Build/utility scripts
├── translations/          # i18n translation files
├── docs/                  # Project documentation
├── apis/                  # Generated API specs
└── types/                 # Additional type declarations
```
