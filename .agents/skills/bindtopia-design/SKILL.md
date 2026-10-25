---
name: bindtopia-design
description: Preserve and extend Bindtopia's approved island design, logo, the single light theme, typography, and component patterns. Use for every Bindtopia site change, including new features, pages, navigation, forms, scanning, collection views, responsive layouts, branding, and related iPhone UI.
---

# Bindtopia design

Treat the current approved design as the baseline for additional work. Extend it coherently rather than creating a new visual direction for each feature. Resolve repository-relative paths from the repository root.

## Load the baseline

1. Read `references/design-system.md` before changing UI or branded assets.
2. Inspect the affected implementation. For web changes, inspect `dist/index.html`, `dist/style.css`, `dist/themes.css`, `dist/typography.css`, and `dist/theme.js` as appropriate. Read `dist/app.mjs` and `dist/i18n.mjs` when changing behavior or text.
3. Inspect the approved image or logo asset when making a visual change to it. Use `dist/branding.html` as the brand specimen.

## Preserve the identity

- Keep the name **Bindtopia** and the independent, fan-made positioning.
- Use `poke-island` as the default light theme: the approved sunny cinematic island is the large brand banner at the top. Preserve its composition and the existing fan-made text.
- There is one theme, `poke-island`. Do not add a dark theme or theme toggle without an explicit decision.
- Use the original ocean-orb mark and existing light/dark outlined wordmarks. Reuse the favicon, touch icon and native app icon; do not substitute an official Pokémon logo or invent a new mark for a feature.
- Keep original card images as complete, independent HTML image elements. Layer them over the island with CSS when appropriate. Do not cut out characters, repaint cards, flatten UI/card layers into a background.
- Preserve the distinction between background concept art, original card content, and functional HTML controls.

## Extend components

Reuse existing `.primary`, `.outline`, `.searchbox`, `.scanner`, `.card`, `.tag`, `.resultsbar` and dialog patterns. Use the semantic tokens in the reference for new surfaces, text, borders, links and controls. Preserve a clear primary action, readable card metadata and generous spacing.

Keep the approved banner and navigation recognizable when adding pages. Keep original card artwork unchanged by theme filters. Use responsive grids, visible keyboard focus, accessible names, usable touch targets and the existing mobile layout conventions.

Do not introduce a new framework, remote font loader, animation library or design system for an isolated feature. Prefer a small change to the current buildless HTML/CSS/JavaScript structure. Keep labels and controls understandable to collectors rather than exposing implementation details.

## Keep fonts and language consistent

Use self-hosted **Roboto** for body text and the configured **Flexo** heading stack with Roboto fallback. Flexo is not embedded: exact Flexo requires licensed webfont files. Do not copy or hotlink commercial font files from pokemon.com. Preserve the outlined wordmarks independently of font availability.

Route new interface copy through all eight `dist/locales/*.json` dictionaries. Keep interface language separate from card language. Preserve official card names and descriptions from their selected source language. Keep English fallback, regional browser-language detection and keyboard accessibility working.

## Preserve behavior and privacy

Preserve existing collection keys (`kaartkompas-saved-v2` and the legacy deletion key), import/export compatibility, local photo/OCR processing. Do not add tracking, analytics, remote font calls, photo uploads, accounts or cloud collection storage as an incidental styling change. If the requested feature changes data handling, update the relevant privacy/cookie documentation alongside the implementation.

Inspect the existing audience and hosting configuration before deployment. Do not change publication audience, DNS or domain ownership as part of a design change. Follow the user's current publication instructions; the design skill adds no separate approval gate.

## Verify and maintain

Run checks proportionate to the actual change: `node --check dist/app.mjs`, `node scripts/check.mjs`, `node scripts/check-i18n.mjs`, and `node scripts/check-sync.mjs` when their behavior is affected. Check local asset links and mobile and desktop presentation for UI work. Report browser or native-build verification limits accurately.

If a user explicitly changes an approved design decision, update the implementation and this skill's reference together. Rebuild the downloadable source archive with `python3 scripts/package-release.py` when their inputs change. Keep this skill and root `AGENTS.md` included in that source export. Commit and push to the actual destination before claiming it is saved there; distinguish source-host persistence from GitHub delivery if permissions block one of them.
