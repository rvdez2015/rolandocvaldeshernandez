# ADR-0011 — Curriculum Intelligence Navigation

## Status
Accepted

## Context

The Curriculum Centre had become database powered, but navigation was still primarily table-and-filter based. As the curriculum repository grows to include Years 5–13, filters alone are not sufficient for rapid daily teaching use.

## Decision

Project X will use a tree-based navigation model for the Curriculum Intelligence Centre. The primary browsing hierarchy is:

```text
Year Group → Scheme of Work → Unit → Lesson
```

The tree is a navigation view over the canonical database curriculum. It must not create a second copy of curriculum records.

## Consequences

- Teachers can reach any lesson using a consistent path.
- Filters and tree navigation remain synchronized.
- The Curriculum Centre becomes closer to an IDE-style professional workspace.
- Future workspaces for units, lessons, resources and assessment can be opened from the same navigation context.

## Rule

A teacher should never need more than three clicks to reach any lesson.
