# Bindtopia — specification

A fan-made, ad-free card catalog with local scanning and collection tools. Static web frontend; native SwiftUI development project for iOS 17+.

## Current implementation

- English card/set JSON index, source metadata and validated upstream synchronization.
- Live TCGdex card details, images and additional card languages.
- Search by name, source ID or collector number; filters, sorting and detail dialogs.
- Web OCR on device with name/number/set-total candidate matching, from a chosen photo, the phone camera or a desktop browser webcam; native Apple Vision scanning.
- Browser-local collection, version-2 backup import/export and scoped deletion controls.
- Eight interface languages with English as the default (a visitor's own choice is remembered), and a separate card-language choice.
- Approved sunny island theme (single theme; the dark theme was removed). Original card images remain separate CSS-positioned layers.
- Original ocean-orb brand, light/dark outlined wordmarks, favicon, PWA and native icon assets.
- Privacy, cookie, terms and rights pages in Dutch and English; the operator is the GitHub account 7ucardie, contact through GitHub Issues.

## Repository contract

- Read AGENTS.md and the required design skill before changes.
- Documentation: tutorial, how-to, reference and explanation under docs/.
- Root README: project overview, accurate badges, installation/use, documentation, scope, support/backers and license.
- REVIEW.md and the PR template define review evidence; CLAUDE.md points to the same project instructions.
- Include skills, docs and applicable notices in source archives.

## Delivery

- GitHub: `7ucardie/Bindtopia`, branch `main`; CI runs on every push.
- Live at https://bindtopia.com through GitHub Pages (custom domain, Enforce HTTPS). Changes are published with the Pages workflow after CI passes. The daily catalog update validates and commits data; it also publishes when the repository variable `PAGES_ENABLED` is `true` (currently not set).
- Third-party image and card-text rights stay with their owners (see the rights page).
- The native app is not built in CI: compile, sign and device-test it in Xcode before TestFlight. It does not yet have the web's trade mode, market prices or picture recognition.

## Deferred

Cloud accounts/synchronization, shared collections, richer collection management and additional localization can be considered explicitly. A backend and privacy changes will be needed for server-side user data.

## Outside the current scope

Marketplace transactions, investment guidance, authoritative grading, authenticity certification and a live valuation feed are not implemented. Visitor statistics use cookieless Cloudflare Web Analytics only when a token is configured, and never under Do Not Track or Global Privacy Control. The project has no revenue model; GitHub Sponsors is voluntary. Card languages are measured daily against TCGdex: a language with at least 300 cards is offered with a matching OCR model (currently 11, including Chinese, Thai and Indonesian; Korean is below the threshold). Camera recognition also compares the card picture with perceptual fingerprints of about 22,000 catalog images (weekly workflow, accuracy reported per run), which also maps other-language cards to the English print with the same artwork. Trade mode scans the live camera locally until a card is recognised (with progress, attempt count and a not-found remark), shows the market's headline price, and keeps a give/get list with totals on the device (localStorage `bindtopia-trade`). A service worker (`dist/sw.js`) keeps an offline copy of the site, the English catalog, the OCR files and the card details, prices and images a visitor viewed (Cache Storage on the device, at most 1,000 details and 500 images), so search, recognition and trade mode work without internet with last known prices marked as offline; it can be cleared from the privacy and cookie pages. An MCP server (`mcp/server.mjs`, stdio, hosted in this repository) exposes search_cards, get_card, list_sets and get_set to AI assistants. Prices are ordered for a regional market (estimated locally from time zone and language, never from IP) with approximate local currency via ECB rates. A free, read-only static JSON API (`/api/v1/`, OpenAPI 3.1) publishes the English catalog with set release years for public developers. Cards, sets and card details show the set's year of release. Card detail shows indicative prices supplied by TCGdex (Cardmarket, TCGplayer) when available, and an opt-in button loads the official card text in the interface language.

## Next changes

- Preserve this approved design while extending features.
- Keep documentation, the design skill and implementation aligned when the user changes the baseline.
