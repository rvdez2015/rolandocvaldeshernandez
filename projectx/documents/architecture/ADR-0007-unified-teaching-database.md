# ADR-0007 — Unified Teaching Database

**Status:** Accepted  
**Date:** 2026-06-30  
**Release:** Project X v4.0 Release 0.5

## Context

Project X has reached the point where separate JSON files, local browser storage and standalone assessment databases would create duplicated knowledge. The imported `exam_system.db` already contains structures for schemes of work, units, lessons, specification mapping, questions, mark schemes, delivery, AI jobs and analytics.

## Decision

Project X will adopt a **Unified Teaching Database** as the canonical long-term data architecture. The database will become the authoritative structured store for curriculum, assessment, teaching delivery, AI outputs and analytics. Browser-friendly JSON will remain available as an exported runtime layer for GitHub Pages until a server or local application runtime is introduced.

## Consequences

- Schemes of Work, Units and Lessons become first-class database entities.
- Question Banks and Assessment Centre will use the same question and mark scheme tables.
- AI Lab outputs will be attached to the same entities as curriculum and assessment records.
- Analytics will be computed from teaching, assessment and lesson-progress data rather than isolated spreadsheets.
- Existing JSON files become export/cache layers, not the permanent source of truth.
- Legacy tables are preserved for migration audit but should not drive new features.

## Core Principle

**Store once in the database. Export many views. Reuse everywhere. Nothing is ever lost.**
