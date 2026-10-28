# Configuration

## Project settings

`project.config.json` holds `githubOwner`, `repository`, `sponsorsUsername`, `customDomain`, `cloudflareAnalyticsToken` (empty disables analytics), `license` and `publicationStatus`. Treat publicationStatus as a recorded state, not independent evidence of successful hosting.

`node scripts/configure-project.mjs` generates `.github/FUNDING.yml`, `dist/project.json` and `dist/CNAME` when a valid domain is configured. It does not register a domain, change DNS or configure Pages through the GitHub API.

## Browser URL and storage

| Setting | Meaning |
| --- | --- |
| `?ui=nl` (or another supported interface code) | Interface language |
| Card-language sidebar choice | Catalog and OCR language; separate from interface |
| `kaartkompas-saved-v2` | Existing collection localStorage key; preserve for compatibility |
| `kaartkompas-saved` | Legacy key removed by deletion controls |
| `bindtopia-interface-language`, `bindtopia-market` | Interface language and market the visitor chose |
| `bindtopia-trade` | Trade-mode give/get list; removed by *Clear trade* or *Clear offline data* |
| Cache Storage `bindtopia-site`, `-ocr`, `-cards`, `-images` (versioned) | Offline copy kept by `dist/sw.js`; network first for the site and card details, so online visitors always get current files |

The native app uses local UserDefaults and a bundled index. It does not share browser storage or automatically synchronize.

## Hosting and automation

- `.github/workflows/ci.yml`: source and documentation checks.
- `.github/workflows/catalog-update.yml`: daily data update; Pages steps require `PAGES_ENABLED=true`.
- `.github/workflows/github-pages.yml`: manual static deployment.

Do not add user data, API tokens, Apple certificates or signing keys to public configuration. For the DNS records, see [HOSTING.md](../../HOSTING.md).
