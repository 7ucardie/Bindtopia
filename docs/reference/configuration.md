# Configuration

## Project settings

`project.config.json` holds `githubOwner`, `repository`, `sponsorsUsername` (empty hides every GitHub Sponsors link; fill it in once the Sponsors account is active), `customDomain`, `cloudflareAnalyticsToken` (empty disables analytics), `kofiUsername` (empty hides the Ko-fi links; the legal pages also name the Ko-fi page in their text, so update those when it changes), `costs` (the running costs listed under *Costs and support* on the rights page: `item`, `itemEn`, `perYear` as a number or `null`, `currency`), `license` and `publicationStatus`. Treat publicationStatus as a recorded state, not independent evidence of successful hosting.

`node scripts/configure-project.mjs` validates these values and generates `.github/FUNDING.yml` (Ko-fi and GitHub Sponsors, each only when set), `dist/project.json` and `dist/CNAME` when a valid domain is configured. It does not register a domain, change DNS or configure Pages through the GitHub API.

## Browser URL and storage

| Setting | Meaning |
| --- | --- |
| `?ui=nl` (or another supported interface code) | Interface language |
| `?card=base1-4` (a catalog card ID) | Opens that card's details once the catalog has loaded; set while a detail is open, removed when it closes. Unknown IDs are ignored |
| Card-language sidebar choice | Catalog and OCR language; separate from interface |
| `kaartkompas-saved-v2` | Existing collection localStorage key; preserve for compatibility |
| `kaartkompas-saved` | Legacy key removed by deletion controls |
| `bindtopia-interface-language`, `bindtopia-market` | Interface language and market the visitor chose |
| `bindtopia-trade` | Trade-mode give/get list; removed by *Clear trade* or *Clear offline data* |
| Cache Storage `bindtopia-site`, `-ocr`, `-cards`, `-images` (versioned) | Offline copy kept by `dist/sw.js`; network first for the site and card details, so online visitors always get current files |

The native app uses local UserDefaults and a bundled index. It does not share browser storage or automatically synchronize.

## Hosting and automation

- `.github/workflows/ci.yml`: source and documentation checks.
- `.github/workflows/catalog-update.yml`: daily data update (commits only; publishing follows through `github-pages.yml`).
- `.github/workflows/fingerprints.yml`: weekly picture fingerprints (commits only; publishing follows through `github-pages.yml`).
- `.github/workflows/github-pages.yml`: static deployment after a green CI run on `main`, or by hand.

Do not add user data, API tokens, Apple certificates or signing keys to public configuration. For the DNS records, see [HOSTING.md](../../HOSTING.md).
