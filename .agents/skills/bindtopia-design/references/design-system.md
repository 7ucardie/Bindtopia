# Approved Bindtopia design system

## Light theme: `poke-island`

Use the sunny cinematic island and original full-card overlays. The approved banner contains the Bindtopia name and `FAN-MADE COLLECTOR PROJECT`. Its visual palette comes from the sky, lagoon, sunlit stone and warm sunlight.

`dist/assets/bindtopia-cinematic-day.png` is the master file. The site serves WebP renditions of it (`-720`, `-1100`, `-1672.webp`, via `srcset`); regenerate them with sharp when the master changes and keep the artwork itself unchanged.

| Role | Value / token |
| --- | --- |
| Brand wordmark, strongest headings | `#082C55` |
| Primary action | `--green: #0D65B5` (the legacy token name is green; its light-theme value is blue) |
| Links / accent | `--accent: #126487` |
| Page | `--bg: #F2F8FD` |
| Main text | `--ink: #16334F` |
| Secondary text | `--muted: #536B80` |
| Surface | `--surface: #FFFEF9` |
| Form field | `--field: #FFFFFF` |
| Border | `--line: #CBDDE9` |
| Card stage | `--stage: #E8F3FA` |
| Subtle surface | `--subtle: #E3F1F9` |
| Tag surface / text | `--tag: #DCF0EE` / `--tagInk: #1C6065` |
| Small sunlit highlight | `#FFF2C9` with dark readable text |
| Component corner radius | `--radius: 16px`; larger banner corners remain as implemented |

Use blue for meaningful actions, turquoise for secondary accents and soft gold sparingly. Keep page surfaces light and clean. Do not turn the whole interface into a bright multicolor game screen.

## No dark theme

The sunny island (`poke-island`) is the only theme. There is no dark theme or theme toggle. Do not reintroduce a dark theme or theme toggle without a new explicit decision.

Use real HTML for newly added text/actions. The approved artwork's embedded brand text is fixed; do not add further functional or translated copy into generated images. Keep alt text meaningful and avoid duplicate visible wordmarks.

## Existing implementation and scope

- `dist/theme.js`: supported theme IDs for the URL parameter; `poke-island` is the default and only public theme.
- `dist/style.css`: base layout and shared components.
- `dist/themes.css`: shared island palette rules.
- `dist/typography.css`: final approved typography, banner, light palette and wordmarks. 
- `dist/i18n.mjs` and `dist/locales/`: Dutch, English, German, French, Spanish, Italian, Portuguese and Polish interface text; English fallback.
- `dist/app.mjs`: start-up wiring only. Behavior lives in one module per part: `catalog.mjs` (search, filters, grid), `detail.mjs` (card dialog, prices, sharing), `collection.mjs` (saved cards, backups), `scanner.mjs` (photo/camera scan), `trade-mode.mjs`, `ocr.mjs` (shared text/picture recognition), with `state.mjs`, `ui.mjs` and `dialogs.mjs` shared.
- `dist/branding.html`: approved brand reference.

The repository target is `7ucardie/Bindtopia`; the registered target domain is `bindtopia.com`. Read `project.config.json` and actual hosting state instead of assuming GitHub delivery, Pages activation or public DNS has succeeded. A configured target is not proof of deployment.
