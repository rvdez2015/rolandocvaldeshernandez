# ADR-0012 — Universal Workspace Architecture

## Status
Accepted

## Context
Project X is moving from separate pages to reusable professional workspaces. The Lesson Workspace and Unit Workspace will become the first teacher-facing implementations.

## Decision
All major Project X workspaces will share a common architecture: breadcrumb navigation, workspace header, context panel, ribbon commands, workspace tabs, quick actions and status/readiness indicators.

## Consequences
- The Lesson Workspace becomes the main operational screen for teaching.
- New modules can reuse the same layout model.
- Teacher workflows become consistent across Curriculum, Assessment, Evidence, AI and Analytics.
