# Data Model: shipit-kit

> Entity definitions for 001-shipit-kit

## Status

- **Phase:** Complete
- **Updated:** 2026-02-02

## Overview

No new domain entities required. Shep-kit operates on file-based specifications stored in `specs/` directory.

## File-Based "Entities"

### Spec Directory

```
specs/NNN-feature-name/
```

- **NNN**: 3-digit sequential number (001, 002, ...)
- **feature-name**: kebab-case identifier

### Spec Files

| File            | Purpose                               | Created By              |
| --------------- | ------------------------------------- | ----------------------- |
| `spec.md`       | Requirements, scope, dependencies     | `/shipit-kit:new-feature` |
| `research.md`   | Technical decisions, analysis         | `/shipit-kit:research`    |
| `plan.md`       | Architecture, implementation strategy | `/shipit-kit:plan`        |
| `tasks.md`      | Task breakdown with parallelization   | `/shipit-kit:plan`        |
| `data-model.md` | Entity changes (if needed)            | `/shipit-kit:plan`        |
| `contracts/`    | API specs (if needed)                 | `/shipit-kit:plan`        |

## Future Considerations

If specs need to be queryable (search, filter, status tracking), consider:

- Adding to SQLite database
- TypeSpec model: `tsp/domain/entities/feature-spec.tsp`

For now, file-based is sufficient and keeps specs version-controlled with the code.

---

_No domain model changes required for this feature_
