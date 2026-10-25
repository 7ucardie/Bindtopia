# Public API

Bindtopia publishes its English card catalog as a free, read-only JSON API. The files are static, served by GitHub Pages, regenerated with every deployment and refreshed by the daily catalog update.

- **Base URL:** `https://bindtopia.com/api/v1/`
- **Authentication:** none. No API key, no account.
- **CORS:** allowed from any origin (GitHub Pages sends `Access-Control-Allow-Origin: *`), so browsers can call it directly.
- **Format:** JSON (UTF-8). The OpenAPI 3.1 description is at [`/api/v1/openapi.json`](https://bindtopia.com/api/v1/openapi.json).

## Endpoints

| Path | Returns |
| --- | --- |
| `index.json` | API metadata: update time, card and set counts, endpoint list, source and terms |
| `sets.json` | All sets: `id`, `name`, `releaseDate`, `year`, `cardCount`, `logo`, `symbol`, `url` |
| `sets/{setId}.json` | One set plus its `cards` |
| `cards.json` | All cards in brief: `id`, `localId`, `name`, `setId`, `images`, `url` (about 6 MB) |
| `cards/{cardFileId}.json` | One card plus its `set` |
| `openapi.json` | OpenAPI 3.1 specification |

`images` holds `small` and `large` image URLs from TCGdex, or `null` when no image exists. `year` is the release year of the set the card was printed in.

### Card file IDs

Most card IDs can be used directly (`cards/base1-4.json`). A few contain characters that are unsafe in a URL path; in the file name every character outside `A-Z a-z 0-9 . _ -` is written as `_` plus its uppercase hexadecimal code point, so `exu-!` becomes `cards/exu-_21.json`. Every record carries its own `url`, so you never have to build this yourself.

## Examples

```sh
curl https://bindtopia.com/api/v1/cards/base1-4.json
curl https://bindtopia.com/api/v1/sets/base1.json
```

```js
const sets = await (await fetch('https://bindtopia.com/api/v1/sets.json')).json();
const oldest = sets.filter(s => s.year).sort((a, b) => a.year - b.year)[0];
```

## Usage policy

- Free for any use, including commercial, within the limits below. Please credit **TCGdex** as the data source and link to Bindtopia when you show the data publicly.
- Card data comes from [TCGdex](https://tcgdex.dev) (MIT). Card images are hosted by TCGdex and belong to their rights holders; the API does not license them. Pokémon and card artwork are trademarks and copyrights of their owners; Bindtopia is an unofficial fan project.
- No warranty and no guaranteed availability: no rights can be derived from the data. Fields may be missing or wrong.
- Cache responses and avoid more than about one request per second; GitHub Pages applies its own [usage limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits). For bulk use, download `cards.json` and `sets.json` once.
- `v1` stays backward compatible: fields may be added but are not removed or renamed. Breaking changes get a new version path.
- Requests are served by GitHub Pages, which logs IP addresses for security; Bindtopia itself stores nothing about API calls and the JSON files contain no analytics.

## Building locally

```sh
node scripts/build-api.mjs   # writes dist/api/v1 from dist/data
```

The generated folder is not committed; the Pages workflow builds it on every deployment.
