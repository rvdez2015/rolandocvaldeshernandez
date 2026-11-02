# Revision approval → Firebase → Classroom: staged rollout

## Verified starting state (30 October 2026)
- `review.mjs` writes **owner-only proposals**, not canonical lesson updates.
- `sync.mjs` reads the immutable Year 11 release and can PATCH the description
  of exactly one eligible **DRAFT** Classroom material, after manual confirmation.
- Existing Classroom edits/attachments and published materials are deliberately
  guarded against overwrites. Do not remove these safety checks.
- GitHub Pages cannot be trusted to enforce write permissions: Firebase rules and
  authenticated backend enforcement are mandatory.

## Development branch initial change
`approval-core.mjs` creates a **separate immutable owner-private approved
lesson revision** from a validated proposal and refuses unsupported paths,
stale field values and missing approval metadata. This is a pure helper:
it does not read or write production Firebase or Classroom.

## Remaining engineering work (NOT YET IMPLEMENTED)
1. Establish deployed Firestore/Storage rules and an authenticated approval
   endpoint or transaction. Verify exact owner UID server-side.
2. Read latest proposal head; verify unchanged source fingerprint; lock/compare
   base approval head; allocate immutable revision and atomically update a
   separate approved pointer (never overwrite source).
3. Persist structured approval audit and pending publication record, using
   idempotency key (course ID, material ID, approved revision).
4. Generate a separately approved student-facing projection; strip teacher
   notes, answer keys and sensitive data. Do not send teacherPlan wholesale.
5. Reconcile existing Classroom material by stored stable ID and marker.
   Support DRAFT and PUBLISHED only after distinct review of permissions
   and semantics. Preserve attachments and any manual teacher edits; conflicts
   must stop for review rather than overwrite.
6. Verify Classroom GET after PATCH, then acknowledge the approved revision.
   Record failures as pending/error with safe retry, never imply dual-system
   atomicity.
7. Add emulator tests (owner vs anonymous), stale-write/concurrent-version
   tests and mocked Classroom API tests before enabling writes in production.

## Acceptance test
Edit one Year 11 learning objective; save proposal; explicitly approve;
reload approved lesson from Firestore; preview student-facing Classroom text;
update the existing matching Classroom material (no duplicate); fetch and
verify its ID/description; check published status and revision audit. A
failed Classroom update must leave Firebase approval intact and pending.
