# ADR-0010 — Professional Standards Centre

## Status
Accepted for Project X v4.0 Release 1.0 Alpha.

## Context
Project X is becoming a Teaching Operating System. In addition to curriculum, assessment, evidence, AI and analytics, it needs a safe professional compliance space for safeguarding and statutory training certificates.

## Decision
Create a dedicated Professional Standards Centre with a Safeguarding section. Certificate files are stored as professional evidence files and referenced through metadata JSON. The module is separate from the Curriculum Repository and must not store pupil-identifiable information.

## Consequences
- Safeguarding certificates are accessible from Project X navigation.
- Certificates can be searched and filtered by category.
- The database remains lightweight because certificate files are stored as documents, not embedded database records.
- Privacy by Design is reinforced: curriculum and professional evidence are separated from pupil data.
