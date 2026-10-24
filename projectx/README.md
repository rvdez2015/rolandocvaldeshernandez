# Project X — Landing page and universal UI standard v1

## Included
- `index.html` — replacement for `/projectx/index.html`; shows only currently relevant working centres and current development priorities.
- `assets/projectx-ui.css` — shared visual system, accessibility, layout, responsive design and print styling.
- `assets/projectx-ui.js` — shared theme preference.
- `templates/module-template.html` — starting template for NEW or deliberately migrated modules.

## Install
1. Back up the existing `/projectx/index.html`.
2. Upload `index.html` to `/projectx/index.html`.
3. Upload both `assets` files to `/projectx/assets/`.
4. Test links, mobile layout and light/dark theme.
5. Do NOT replace the existing curriculum or observation HTML/JS with the example template.
6. Legacy modules and old navigation files remain untouched. The new landing uses a self-contained, minimal sidebar rather than the old registry that listed unfinished apps.

## UI contract
- All new pages use the same sidebar, top header, spacing, typography, cards, status language and theme.
- Modules retain their own authenticated workflows; the template does NOT grant permissions.
- Do not show 'verified' unless a module was actually functionally tested.
- Do not display planned features as clickable apps.
- Do not inject untrusted text with innerHTML.
- Keep forms labelled and announce outcomes via role=status.
- When migrating existing modules, merge the shell without replacing their working JavaScript or Firebase wiring.

## Scope / limitations
This package standardises the NEW landing page and provides the reference HTML template; it does NOT automatically migrate every existing Project X page. Links assume GitHub Pages project path `/rolandocvaldeshernandez/projectx/`. It has not been tested in the live deployment.
