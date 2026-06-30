# Project X v4.0 Release 0.5 — Unified Teaching Database

## Purpose

Release 0.5 establishes the database foundation for Project X as a Teaching Operating System. The uploaded `exam_system.db` is now included as the canonical development database under:

```text
data/database/exam_system.db
```

The database has also been documented through generated exports:

```text
data/database/projectx-database-schema.json
data/database/projectx-database-summary.json
data/database/schemes-export.json
```

## What the database already contains

| Domain | Existing strength |
|---|---|
| Curriculum | Schemes of Work, Units, Lessons, lesson ordering and specification links |
| Assessment | Questions, paper sets, mark schemes, mark points and question versions |
| Teaching | Teachers, teaching groups, lesson instances, timetable-ready structures |
| AI | AI jobs, outputs, audit logs and prompt template structure |
| Analytics | Lesson diagnostics, recommendations, transition readiness and risk flags |
| Migration | Legacy tables preserved for audit and controlled migration |

## Current database metrics

| Entity | Count |
|---|---:|
| Schemes of Work | 5 |
| Scheme Units | 15 |
| Scheme Lessons | 65 |
| Questions | 464 |
| Question Versions | 464 |
| Mark Points | 852 |
| Specification Topics | 13 |
| Specification Points | 38 |
| Students | 24 |
| Teaching Groups | 3 |
| AI Jobs | 80 |

## Architecture decision

Project X will move from this pattern:

```text
JSON files + LocalStorage + separate assessment database
```

to this pattern:

```text
Unified Teaching Database
        ↓
Exported JSON runtime views
        ↓
Project X web modules
```

This is necessary because GitHub Pages cannot directly run SQLite queries in the normal browser environment without an additional runtime layer. Therefore, the database becomes the authoritative development source, and JSON exports become the browser-facing data layer.

## Canonical engines

```text
Project X
├── Curriculum Engine
├── Scheme of Work Engine
├── Lesson Workspace Engine
├── Assessment Engine
├── Question Bank Engine
├── AI Engine
├── Analytics Engine
└── Evidence / Document Engine
```

## Immediate next implementation tasks

1. Build a repeatable export script from SQLite to Project X JSON.
2. Rebuild Curriculum Centre from `schemes_of_work`, `scheme_units` and `scheme_lessons`.
3. Connect Question Banks to `questions`, `question_versions`, `markschemes` and `mark_points`.
4. Add the official OCR specification as authoritative spec data.
5. Map each lesson to official spec points through `lesson_spec_points` and `unit_spec_points`.
6. Keep `legacy_*` tables read-only until migration is complete.

## Release status

This release does not yet replace every Project X screen. It establishes the permanent data architecture and packages the database, schema exports, release documentation and architectural decision required for the next build phase.
