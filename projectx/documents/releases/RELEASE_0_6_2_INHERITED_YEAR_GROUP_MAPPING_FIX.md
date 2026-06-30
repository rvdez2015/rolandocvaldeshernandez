# Project X v4.0 — Release 0.6.2
## Inherited Year Group Mapping Fix

Release 0.6.2 fixes the Curriculum Centre filtering issue where selecting Year 13 showed no units despite OCR H446 curriculum data existing in the database.

## Implemented

- Added runtime inheritance of Year Group from Scheme of Work to Units and Lessons.
- Added runtime inheritance of Key Stage, Exam Board and Academic Year where missing.
- Renamed imported schemes in the read model:
  - `Scheme of work` → `OCR H446 A Level Scheme of Work`
  - `Scheme of work (1)` → `OCR J277 GCSE Scheme of Work`
- Hid empty placeholder schemes from Scheme filters.
- Preserved 2025-2026 lesson completion status.
- Updated browser storage key to prevent old cached filter data from masking the fix.
- Added ADR-0009.

## Result

The Curriculum Centre now correctly supports:

```text
Year Group → Scheme of Work → Unit → Lesson
```

using the Unified Teaching Database as the canonical source.
