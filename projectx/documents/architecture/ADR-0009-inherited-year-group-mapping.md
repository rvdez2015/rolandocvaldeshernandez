# ADR-0009 — Inherited Year Group Mapping

## Status
Accepted

## Context
The Unified Teaching Database stores `target_year_group` on `schemes_of_work`, while `scheme_units` and `scheme_lessons` do not always store their own year group values. The Curriculum Centre was previously filtering units and lessons as if `yearGroup` existed directly on every record, which caused valid Year 13 OCR H446 units to disappear.

## Decision
The Curriculum Centre now treats the parent Scheme of Work as the authoritative source for year group, key stage, exam board and academic year when child records do not provide those fields directly.

The runtime model derives:

```text
Scheme of Work.target_year_group → Unit.yearGroup → Lesson.yearGroup
```

Imported placeholder schemes with no units and no lessons are hidden from filter dropdowns.

## Consequences
- Year Group filtering now works for database-derived units and lessons.
- The populated OCR H446 scheme appears as the Year 13 A Level scheme.
- Empty default migration schemes no longer confuse the UI.
- The database remains normalized; the UI builds an enriched read model for navigation.
