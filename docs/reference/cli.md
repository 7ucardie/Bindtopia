# Command reference

Run commands from the repository root.

| Command | Purpose |
| --- | --- |
| `python3 -m http.server 8000 --directory dist` | Serve the static portal locally |
| `node scripts/check-syntax.mjs` | Check the syntax of every module in `dist/` and the service worker |
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
| `npm run mcp` | Start the MCP server over stdio (normally started by an AI client) |
| `node scripts/sync-languages.mjs` | Measure which TCGdex card languages have a usable catalog |
| `node scripts/build-fingerprints.mjs [--evaluate]` | Fingerprint catalog images (incremental) or measure recognition accuracy |
| `node scripts/sync-rates.mjs` | Fetch the ECB exchange rates used for price conversions |
| `node scripts/build-api.mjs` | Generate the public JSON API in `dist/api/v1` |
| `node scripts/configure-project.mjs` | Generate sponsor/project/domain files from project.config.json |
| `python3 scripts/create-brand.py` | Regenerate brand vectors/raster icons; requires Pillow and fontTools |

Ordinary web use and catalog validation do not require npm installation; only the test suites do. Brand regeneration requires its Python dependencies; keep the checked-in assets when not changing the brand. The native app requires Xcode on macOS.
