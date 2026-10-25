# Bindtopia — preview specification

A fan-made, ad-free card catalog with local scanning and collection tools. Static web frontend; native SwiftUI development project for iOS 17+.

## Current implementation

- English card/set JSON index, source metadata and validated upstream synchronization.
- Live TCGdex card details, images and additional card languages.
- Search by name, source ID or collector number; filters, sorting and detail dialogs.
- Web OCR on device with name/number/set-total candidate matching; native Apple Vision scanning.
- Browser-local collection, version-2 backup import/export and scoped deletion controls.
- Eight interface languages, browser-language fallback and separate card-language choice.
- Approved sunny island theme (single theme; the dark theme was removed). Original card images remain separate CSS-positioned layers.
- Original ocean-orb brand, light/dark outlined wordmarks, favicon, PWA and native icon assets.
- Draft privacy/cookie/usage/rights information in Dutch and English.

## Repository contract

- Read AGENTS.md and the required design skill before changes.
- Documentation: tutorial, how-to, reference and explanation under docs/.
- Root README: project overview, accurate badges, installation/use, documentation, scope, support/backers and license.
- REVIEW.md and the PR template define review evidence; CLAUDE.md points to the same project instructions.
- Include skills, docs and applicable notices in source archives.

## Delivery and launch work

- GitHub target: `7ucardie/Bindtopia`; source writes currently fail with integration permissions.
- Registered domain: `bindtopia.com`; prepared configuration does not mean DNS or Pages is active.
- Keep the existing preview private while visual iterations are underway; follow explicit publication instructions.
- Finalize legal operator/contact information, hosting disclosures and third-party image rights before public launch.
- Compile, sign and device-test the native app in Xcode before TestFlight. A source archive is not a signed app.
- The daily Actions update becomes active only after source delivery to the default branch; deployment requires Pages setup and its repository variable.

## Deferred

Cloud accounts/synchronization, shared collections, richer collection management and additional localization can be considered explicitly. A backend and privacy changes will be needed for server-side user data.

## Outside the current scope

Marketplace transactions, investment guidance, authoritative grading, authenticity certification and a live valuation feed are not implemented. Visitor statistics use cookieless Cloudflare Web Analytics only when a token is configured, and never under Do Not Track or Global Privacy Control. The project has no revenue model; GitHub Sponsors is voluntary. Cards, sets and card details show the set's year of release. Card detail shows indicative prices supplied by TCGdex (Cardmarket, TCGplayer) when available, and an opt-in button loads the official card text in the interface language.

## Next changes

- Preserve this approved design while extending features.
- Keep documentation, the design skill and implementation aligned when the user changes the baseline.
