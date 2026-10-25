# Command reference

Run commands from the repository root.

| Command | Purpose |
| --- | --- |
| `python3 -m http.server 8000 --directory dist` | Serve the static portal locally |
| `node --check dist/app.mjs` | Check JavaScript syntax |
| `node scripts/check.mjs` | Validate catalog integrity and matching cases |
| `node scripts/check-i18n.mjs` | Validate interface dictionaries, fallback and Japanese matching |
| `node scripts/check-sync.mjs` | Validate updater acceptance/rejection cases |
| `node scripts/check-docs.mjs` | Validate local documentation links |
| `npm ci` | Install the test tooling (Playwright) from the lockfile |
| `npm run test:unit` | Unit tests for matching, translation and card-detail helpers |
| `npm run test:integration` | Serve `dist/` locally and check pages, assets, catalog and locales |
| `npx playwright install chromium` then `npm run test:e2e` | Browser tests on desktop and phone viewports with mocked TCGdex responses |
| `npm test` | All checks and test suites |
| `node scripts/sync-catalog.mjs` | Fetch and validate an English catalog update |
| `node scripts/configure-project.mjs` | Generate sponsor/project/domain files from project.config.json |
| `python3 scripts/create-brand.py` | Regenerate brand vectors/raster icons; requires Pillow and fontTools |

Ordinary web use and catalog validation do not require npm installation; only the test suites do. Brand regeneration requires its Python dependencies; keep the checked-in assets when not changing the brand. The native app requires Xcode on macOS.
