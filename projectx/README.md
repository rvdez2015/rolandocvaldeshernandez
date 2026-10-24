# Project X — Seventh Ray official landing and shared theme v2.1

## Deliverables
- `index.html`: new landing page using the approved navy, violet and gold Seventh Ray dashboard style.
- `assets/projectx-ui.css`: shared platform design system (from working School Centre v2).
- `assets/projectx-landing.css`: landing-specific responsive layout.
- `assets/seventh-ray-mark.svg`: original provisional seven-ray emblem.
- `apps/school-profile/index.html`, `school-centre.css`, `school-centre.js`, `default_school_profile.json`: working browser-local School Centre from previous v2 package, unchanged in this release.

## Install
1. Back up `/projectx/index.html` and export any browser-local school configuration.
2. Replace `/projectx/index.html` and upload `assets/projectx-landing.css` and other missing assets.
3. Keep the v2 School Centre files in their existing paths. If already deployed, they do not need replacing.
4. Hard-refresh `/projectx/` and test overview, school centre, curriculum and observation links.
5. Do not overwrite Curriculum Centre or Observation Centre JavaScript/HTML. Their migration to the shared theme is a separate, controlled change.

## Design contract for future pages
Shared dark navy sidebar; blue/violet banner; gold Seventh Ray signature; serif headings; white content cards; responsive accessible controls; functional workflows untouched.
The screenshot is a visual reference, not a functional UI file. The generated SVG is an original placeholder emblem, not an official I AM Movement insignia.

## Limits
This release changes the landing and theme assets; it does not connect Firebase, migrate legacy modules or prove browser integration. School Centre remains localStorage-only.
