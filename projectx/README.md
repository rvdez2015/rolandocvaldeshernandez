# Project X — School Profile & Timetable Management Centre (local pilot)

## Install on GitHub Pages
1. Back up existing `/projectx/index.html` and `/projectx/assets/` files.
2. Upload `index.html` to `/projectx/index.html` to expose the new centre on the landing page.
3. Upload `assets/projectx-ui.css` and `assets/projectx-ui.js` to `/projectx/assets/` (same shared UI standard as previously supplied).
4. Upload the entire `apps/school-profile/` folder into `/projectx/apps/school-profile/`.
5. Open `https://rvdez2015.github.io/rolandocvaldeshernandez/projectx/apps/school-profile/`.
6. Create a custom school profile, configure periods, add a timetable slot, test duration resolution, export JSON, reload, and test import.

## Implemented
- Read-only default school profile: 45 minutes, eight periods/day, one-week rotation, Years 5–13, Europe/London.
- Custom school profiles with independently configurable duration, periods, rotation and time zone.
- Versioned profile edits; active profile selection.
- Per-period duration overrides and optional validated bell times.
- Teacher/class/subject timetable slots, week/day/period allocations, conflict checks.
- Double-period duration calculations with explicit intervening break subtraction.
- Date-exception duration preview (manual override only; calendar integration is not yet built).
- Local browser persistence, JSON export/import with schema validation, deletion confirmation.
- Lesson allocation preview and insufficient-time warning.
- Shared Project X sidebar, header, responsive layout and light/dark theme.

## Important limitations
- This is a **functional browser-local pilot**, not a deployed multi-user administration service. Data is saved to browser localStorage only and is not shared across browsers or devices.
- **No Firestore changes**, school-role permissions, secure multi-school tenancy, calendar exceptions database, teacher directory, AI imports or curriculum scheduler writes are included.
- The lesson resolver previews an allocation but does not create or publish a scheduled lesson.
- Timetable changes affect current previews; historical immutable session snapshots are not implemented.
- No live GitHub Pages or browser end-to-end tests have been performed. JavaScript syntax checked.
- For privacy, use pseudonymous teacher/class references in this pilot; do not import personal pupil records.
- The default template is immutable in the UI and import validator; custom schools derive from it.

## Next step for production
Add Firebase Authentication + owner-only Firestore security rules for organisation-owned school profiles and timetable records; migrate local JSON through a controlled, reviewed import. Later implement school-scoped roles, audit logs, immutable schedule/session snapshots and approved AI import staging.
