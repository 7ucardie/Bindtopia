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

The native app uses local UserDefaults and a bundled index. It does not share browser storage or automatically synchronize.

## Hosting and automation

- `.github/workflows/ci.yml`: source and documentation checks.
- `.github/workflows/catalog-update.yml`: daily data update; Pages steps require `PAGES_ENABLED=true`.
- `.github/workflows/github-pages.yml`: manual static deployment.

Do not add user data, API tokens, Apple certificates or signing keys to public configuration. For the complete prepared DNS records, see [HOSTING.md](../../HOSTING.md).
