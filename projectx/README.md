# Project X — Seventh Ray Violet Theme v2.2

## Changes
The Project X Overview and School Profile & Timetable Centre now use shades of amethyst, royal violet, lavender, and gold. A new lightweight SVG artwork supplies the radiant Seventh Ray mountain/aurora background in the sidebar, top header, and main banner.

This is a CSS-and-background-asset update. HTML, JavaScript, school profile JSON, timetable calculations, storage, import/export and module navigation are byte-for-byte unchanged from the previous v2.1 package.

## Deploy only these four files
- `projectx/assets/projectx-ui.css`
- `projectx/assets/projectx-landing.css`
- `projectx/assets/seventh-ray-violet-landscape.svg` (NEW)
- `projectx/apps/school-profile/school-centre.css`

The ZIP also contains the existing HTML/JS/JSON for reference, but do not overwrite a newer deployed version of those files.

## Important
The background is a new vector illustration (not the generated screenshot, which contains embedded UI). This avoids duplicate/fake controls and allows responsive rendering.
If browser cache shows old colours, hard refresh Ctrl+F5 or clear GitHub Pages cache.
The Curriculum and Observation Centres have NOT yet been themed; migrate them carefully after testing.
No live browser/GitHub Pages verification or Firebase sync has been performed.
