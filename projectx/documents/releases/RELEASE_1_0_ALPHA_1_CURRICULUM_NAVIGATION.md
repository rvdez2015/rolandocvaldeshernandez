# Project X v4.0 — Release 1.0 Alpha.1
## Curriculum Intelligence Centre: Phase 1 Navigation

**Status:** Completed  
**Date:** 2026-06-30

## Purpose

Release 1.0 Alpha.1 begins the refinement of the Curriculum Centre into the Curriculum Intelligence Centre. The focus of this release is navigation: teachers should be able to reach any scheme, unit or lesson quickly through a consistent hierarchy.

## Scope

- Renamed the working page header to **Curriculum Intelligence Centre**.
- Added a persistent **Curriculum Tree**.
- Introduced the canonical browsing hierarchy: **Year Group → Scheme of Work → Unit → Lesson**.
- Added quick navigation tabs for Overview, Schemes, Units and Lessons.
- Added a Navigation Context summary so filters are always visible.
- Added Curriculum Health indicators for completion, Digital Lesson Twins and linked assets.
- Added a Teaching Sequence panel for fast unit access.
- Preserved the existing database-powered filtering model.
- Kept the 2025–2026 completion status fix from Release 0.6.1.
- Kept inherited year-group mapping from Release 0.6.2.

## Design Principle

A teacher should never need more than three clicks to reach any lesson.

## Navigation Contract

The Curriculum Intelligence Centre must treat the database-derived curriculum as a hierarchy:

```text
Academic Year
  → Year Group
    → Scheme of Work
      → Unit
        → Lesson
```

The tree changes the current navigation context rather than duplicating data.

## Next Phase

Release 1.0 Alpha.2 should focus on the **Unit Workspace**, including richer unit summaries, lesson sequence, resources, assessments, delivery history and next-year improvements.
