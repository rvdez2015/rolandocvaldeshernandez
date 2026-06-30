# ADR-0008 — Database-Powered Curriculum Centre

## Status
Accepted

## Context
Release 0.5 established the Unified Teaching Database as the canonical development database for Project X. Prior Curriculum Centre releases still depended on JSON/localStorage seed data and therefore risked diverging from the database schema.

## Decision
The Curriculum Centre will now load from a database-derived curriculum export:

`data/curriculum/database-curriculum.json`

This export is generated from the Unified Teaching Database and normalised into the Project X curriculum runtime model:

- Schemes of Work
- Units
- Lessons
- Resources
- Database identifiers
- Academic year
- Year group
- Exam board
- Planned minutes
- Lesson sequence

The browser application will use this JSON export as the runtime source until Project X has a live backend capable of querying SQLite directly.

## Consequences
- The Curriculum Centre is now aligned to the Unified Teaching Database.
- Schemes of Work become visible as first-class curriculum objects.
- Units and lessons can be filtered by Year Group, Scheme of Work, Unit and Status.
- The Digital Lesson Twin receives database context.
- Legacy localStorage keys are replaced by a Release 0.6 storage key.

## Rationale
GitHub Pages cannot directly query SQLite in the browser without adding a client-side SQLite runtime or server API. A database-derived JSON export provides the most reliable static-site bridge while preserving the database as the canonical architecture.
