# Curriculum Intelligence Specification

## Purpose

The Curriculum Intelligence Centre is the flagship curriculum application within Project X. It is responsible for navigating, understanding and improving the curriculum.

## Core Questions

The module should help a teacher answer:

1. What am I teaching?
2. Where am I in the curriculum?
3. What resources do I need?
4. What happened the last time I taught this?

## Navigation Principle

The default route through the curriculum is:

```text
Year Group → Scheme of Work → Unit → Lesson
```

The module must keep filters, tree navigation and workspaces synchronized.

## Phase 1 Navigation Requirements

- Show a Curriculum Tree.
- Keep current filter context visible.
- Support Year Group, Scheme, Unit, Lesson navigation.
- Preserve database-derived relationships.
- Preserve privacy-by-design: no named pupil data in curriculum records.

## Future Phases

### Phase 2 — Unit Workspace
- Unit overview
- Lesson sequence
- Resources
- Assessments
- Delivery history
- Next-year improvements

### Phase 3 — Digital Lesson Twin 2.0
- Objectives
- Success criteria
- Teaching activities
- Resources
- Assessment
- Reflection
- Evidence
- AI context

### Phase 4 — Curriculum Intelligence
- Knowledge graph
- Concept progression
- OCR coverage
- National Curriculum coverage
- Resource gaps
- Assessment gaps
