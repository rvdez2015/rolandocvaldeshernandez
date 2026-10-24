# Project X — Firestore Security Gate v2 (2026-10-24)

**STATUS: REVIEW / TEST CANDIDATE. NO FIREBASE CHANGES HAVE BEEN MADE BY THIS PACKAGE.**

This candidate applies to Firebase `project-x-personal`, Firestore `(default)`, and the `y11-j277-canonical-pilot-20261024-r1` owner-private import. It is **not** a shared-teacher or student-publication ruleset.

## Findings from the actual uploader and private JSON

- Previous owner catch-all `match /{document=**}` would override the intended immutable protection. It must be **replaced**, not retained alongside new rules.
- Existing legacy groups are preserved by exact / recursive rules: `catalogueLessons`, `classroomPublications`, `lessons`, `ownerObservationDrafts`.
- All `PX25-Y11-*` catalogue root document writes are denied. These imported lessons must use create-only revision documents and `curriculumPilotIndex`, not mutable root head documents.
- New private revision paths are create-only, and student projection records use top-level field allowlists aligned with the actual payload.
- All imported objects require owner identity, designated release, owner-private visibility, recorded server timestamp and a 64-character hexadecimal source hash.
- Initial pilot release index and release marker are also create-only.

## Verified offline

The static contract validator checked the actual `/mnt/data/ProjectX_Importer_PRIVATE.zip` and confirmed all 1,410 planned records match the intended collection mapping and the student-record top-level field allowlists. Existing local importer checks and the user's screenshot show the Firestore dry run returned 1,410 NEW / 0 MATCH / 0 CONFLICT. Nothing was written.

**NOT VERIFIED YET:** Firebase emulator authorization and rule compilation in a real Firebase rules engine; live existing-feature regression tests; final deployment. Do not claim that the security migration is tested until the emulator or Firebase Rules Playground indicates it passes.

## Safest test sequence

1. Keep copies of your existing GitHub, existing Firestore rules, and known-paths Firestore JSON backups.
2. Use the Firebase Emulator tests (recommended) or the Firebase console Rules Playground (limited alternative) to test this ruleset **before Publish**.
3. Confirm owner can read/write existing legacy collections; anonymous/non-owner is denied; valid new pilot revision can be created; updating/deleting revisions is denied; student projection rejects teacher-only fields; unrelated collections denied.
4. After successful tests, replace the **entire** current Firebase rules text with `firestore.rules.GO_LIVE_AFTER_TESTS`. Do not merely append the new matches to the old catch-all.
5. Click **Publish** in Firebase. Confirm the publish succeeded.
6. Immediately check existing Curriculum Centre / Observation Centre screens and old catalogue revision access as the owner.
7. Return to the Import Centre, reload the local private JSON, sign in, validate, rerun Firestore dry run. It should still report 1,410 new / 0 conflicts.
8. Only then tick the importer acknowledgements and explicitly proceed with the owner-private import. The 94 additional index records and release marker are written during final verification.
9. Save the resulting import log locally; never put the private import JSON or marking keys in public GitHub Pages.

## Quick manual Firebase Rules Playground checks

Firebase Console → `project-x-personal` → Firestore `(default)` → Rules. Paste candidate in the *editor*, but do not click Publish yet. Click **Rules Playground** and simulate:

- `get /databases/(default)/documents/lessons/any-existing-id` with owner UID: **ALLOW**.
- `get /databases/(default)/documents/ownerObservationDrafts/any-existing-id` with owner UID: **ALLOW**.
- `get /databases/(default)/documents/catalogueLessons/1.1d/revisions/any-revision-id` with owner UID: **ALLOW**.
- `get /databases/(default)/documents/catalogueTeacherKeys/PX25-Y11-U01-L001/revisions/y11-j277-canonical-pilot-20261024-r1` with unauthenticated: **DENY**.
- `get` same path with another user UID: **DENY**.
- `get` same path with owner UID: **ALLOW** (even if document does not exist, permission is the point).
- `get /databases/(default)/documents/unmappedCollection/item` with owner UID: **DENY**.

These read tests do not replace create/update/delete emulator tests. Playground create tests must include the **complete** incoming document data and a server timestamp matching `request.time`.

## GitHub Actions emulator test option

There is a ready-to-run Github Actions workflow and test suite in this archive:

- `projectx-security-tests/` (test-only rules, `package.json`, emulator setup, unit tests)
- `.github/workflows/projectx-firestore-security-gate.yml`

Place them at the root of your repository and commit. GitHub → **Actions** → **Project X Firestore Security Gate** → **Run workflow**. The workflow uses Java and the Firestore emulator, without production credentials. Green results provide considerably better authorization assurance than static checking. These tests cannot validate unknown behaviour of the live application and should be followed by post-publish smoke tests.

Alternatively, from the `projectx-security-tests/` directory on a computer with Node.js and Java installed:

```sh
npm install
npm test
python validate_pilot_contract.py /path/to/ProjectX_Importer_PRIVATE.zip
```

## Rollback

If any existing feature fails **after** Publish, restore the original deployed rules from your local `firestore_rules_BACKUP_2026-10-24.rules(.txt)` and click Publish. This emergency rollback restores the previous broad owner grant and does **not** revert any Firestore documents. Do not delete import records as part of a rules rollback.

## Design constraints

- This ruleset intentionally does **not** allow generic teachers to create future revisions. Teacher multi-tenancy and edit attribution need separate security design after initial owner-private pilot.
- Firebase Security Rules govern client SDK access, not service-account admin access.
- The student-projection field allowlists restrict top-level keys but do not independently prove that nested free-form lesson text is safe for public student access. These student records remain owner-private during the pilot.
