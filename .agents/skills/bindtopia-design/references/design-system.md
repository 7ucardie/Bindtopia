# Approved Bindtopia design system

## Light theme: `poke-island`

Use the sunny cinematic island and original full-card overlays. The approved banner contains the Bindtopia name and `FAN-MADE COLLECTOR PROJECT`. Its visual palette comes from the sky, lagoon, sunlit stone and warm sunlight.

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

## Dark theme: `poke-holo` / Holo Vault

| Role | Value / token |
| --- | --- |
| Page | `--bg: #11101C` |
| Main text | `--ink: #EEEAFC` |
| Secondary text | `--muted: #B8B1CE` |
| Border | `--line: #3F3659` |
| Primary | `--green: #C3ADFF` |
| Accent | `--accent: #9AE8E1` |
| Button text | `--buttonInk: #23143F` |
| Surface | `--surface: #201A30` |
| Field | `--field: #211B32` |
| Subtle surface | `--subtle: #2B2240` |
| Tag surface / text | `--tag: #3E2D5C` / `--tagInk: #E0C7FF` |

Use static pearly gradients and gentle depth; avoid constant shimmer, flashing or distracting motion. Retain reduced-motion behavior.

## Canonical assets

Paths are relative to the repository root. Reference these files; do not duplicate large images inside the skill.

| Asset | Path |
| --- | --- |
| Approved daytime brand banner | `dist/assets/bindtopia-cinematic-day.png` |
| Cinematic night concept | `dist/assets/bindtopia-cinematic-title.png` |
| Text-free Holo Vault background | `dist/assets/bindtopia-island-night.png` |
| Earlier sunny environment | `dist/assets/bindtopia-island-day.png` |
| Ocean-orb vector mark | `dist/brand/bindtopia-mark.svg` |
| Wordmark for light surface | `dist/brand/bindtopia-logo-light.svg` |
| Wordmark for dark surface | `dist/brand/bindtopia-logo-dark.svg` |
| Size/contrast reference | `dist/brand/brand-preview.png` |
| SVG favicon / ICO favicon | `dist/icon.svg` / `dist/favicon.ico` |
| Apple touch icon | `dist/apple-touch-icon.png` |
| PWA icons | `dist/brand/bindtopia-icon-192.png`, `dist/brand/bindtopia-icon-512.png` |
| Native iPhone icon | `ios/Bindtopia/Assets.xcassets/AppIcon.appiconset/AppIcon.png` |

Keep the ocean-orb's navy outline, blue upper portion, warm cream lower portion, golden sun and turquoise wave. Preserve light/dark wordmark switching. `scripts/create-brand.py` reproduces the assets from original vector geometry and OFL Roboto outlines; it requires Pillow and fontTools. The ordinary catalog workflow does not need to regenerate the brand.

## Typography and layout

Body: `Bindtopia Roboto`, then Arial/sans-serif. Headings: `Bindtopia Flexo`, then `Bindtopia Roboto`, then Arial/sans-serif. Self-host Roboto from `dist/fonts/Roboto-Variable.ttf` with its OFL notice. Exact Flexo embedding remains pending licensed files; keep commercial font files out of open-source archives unless redistribution is expressly permitted.

Use approximately 8/12/16/24/32px spacing steps. Reuse the current desktop content width, sidebar and card grid. The existing grid reduces to three and then two columns at narrower widths. Match the current rounded cards, restrained shadows, grouped filters and clear search/scan actions. Keep the small-screen banner composition, original-card overlay scale, navigation and interface-language selector usable.

Use real HTML for newly added text/actions. The approved artwork's embedded brand text is fixed; do not add further functional or translated copy into generated images. Keep alt text meaningful and avoid duplicate visible wordmarks.

## Existing implementation and scope

- `dist/theme.js`: supported theme IDs, default day theme and day/night URL toggle.
- `dist/style.css`: base layout and shared components.
- `dist/themes.css`: theme palettes and earlier review variants.
- `dist/typography.css`: final approved typography, banner, light palette and wordmarks. Later overrides here take precedence over earlier theme experiments.
- `dist/i18n.mjs` and `dist/locales/`: Dutch, English, German, French, Spanish, Italian, Portuguese and Polish interface text; English fallback.
- `dist/app.mjs`: catalog, filters, dialogs, local collection and OCR behavior.
- `dist/branding.html`, `dist/utopia.html`: approved design references.
- `dist/pokemon-styles.html`, `dist/design-lab.html`: historical alternatives, not permission to replace the approved defaults.

The repository target is `7ucardie/Bindtopia`; the registered target domain is `bindtopia.com`. Read `project.config.json` and actual hosting state instead of assuming GitHub delivery, Pages activation or public DNS has succeeded. A configured target is not proof of deployment.
