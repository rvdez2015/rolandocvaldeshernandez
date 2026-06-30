# Project X v4.0 — Release 0.6
## Database-Powered Curriculum Centre

Release 0.6 connects the Curriculum Centre to the Unified Teaching Database foundation introduced in Release 0.5.

## Implemented

- Created `data/curriculum/database-curriculum.json` from `data/database/schemes-export.json`.
- Added Schemes of Work as first-class objects in the Curriculum Centre.
- Added combined filters for Year Group, Scheme of Work, Unit, Status and search.
- Rebuilt dashboard KPIs from filtered database curriculum records.
- Rebuilt Units, Lessons and Planner views using the database-derived model.
- Extended the Digital Lesson Twin with database context and teaching/specification notes.
- Added ADR-0008.

## Architecture

Current static-site bridge:

```text
exam_system.db
  ↓ export
schemes-export.json
  ↓ normalise
database-curriculum.json
  ↓ runtime
Curriculum Centre
```

The database remains the canonical source. The JSON runtime export allows GitHub Pages to display the curriculum without a backend server.
