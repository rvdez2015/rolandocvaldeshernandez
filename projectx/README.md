# Project X · Seventh Ray · School Profile & Timetable Centre v2

## What is included
- `index.html`: landing page using the established dark-blue identity and progression.
- `assets/projectx-ui.css`: shared dark-blue, indigo and gold visual system.
- `assets/seventh-ray-mark.svg`: provisional original seven-ray emblem.
- `apps/school-profile/index.html`: redesigned School Profile & Timetable Centre.
- `apps/school-profile/school-centre.css`: module-specific responsive styling.
- `apps/school-profile/school-centre.js`: original school-profile/timetable engine, plus dynamic summary and selected-school bell-time display.
- `apps/school-profile/default_school_profile.json`: unchanged 45-minute default template with confirmed school-day times.
- Other included files are from the previous v1.1 bundle.

## Deploy
Back up/export browser-local school configurations first.
Upload files to matching paths under `/projectx/`. Avoid replacing the Curriculum or Observation Centre pages or their JS.
Hard refresh `/projectx/` and `/projectx/apps/school-profile/`.

## What should work
Create, edit, activate and delete custom school profiles; immutable default; period definitions; teacher/class slots; conflict checks; timetable duration resolver; JSON import/export; reset; theme; in-page section navigation. The timetable summary now follows the selected profile rather than showing hardcoded default times.

## Known limitations
This is still a localStorage-only pilot, not Firestore or multi-user.
The import mechanism requires exact schema v2.1 and matching system template; exported configurations from older versions may need migration. The current localStorage migration from template v1 is preserved.
No AI import or live school data integration is implemented.
The SVG is an original placeholder emblem inspired by seven rays, not an official religious or movement logo.
Static checks passed, but a full live browser and GitHub Pages integration test is still needed.
