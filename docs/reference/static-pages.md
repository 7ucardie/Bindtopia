# Static card and set pages

The catalog is a single-page app: a card detail opens at `?card=<id>` and is drawn in the browser. Search engines index that poorly, so every deploy also publishes plain HTML pages built from the English catalog by `scripts/build-pages.mjs` (run in the GitHub Pages workflow after `build-api.mjs`; the output is not committed).

| Address | Page |
| --- | --- |
| `/card/<cardFileId>/` | One card: name, printed number (`024/128`, or `#009` without an official count), set and release date, the card image, previous and next card in the set, up to 12 other prints of the same name (one per other set first, newest first), and **Open in Bindtopia** (`/?card=<id>&ui=en`) for card text, prices, saving and scanning. |
| `/set/<setFileId>/` | One set: release date, card count and every card in number order with a small image. |
| `/sets/` | All sets by release year, newest first. The start page footer links here. |

`cardFileId` and `setFileId` are the IDs with characters that are unsafe in a path encoded as `_HEX`, as in the [public API](api.md) (`exu-!` → `exu-_21`).

Every page is English (`lang="en"`, the default interface language), has a unique title and description, a canonical address, Open Graph tags with the card image, and `BreadcrumbList` structured data (Bindtopia › Sets › set › card). Pages load only the site's own stylesheets (`style.css`, `themes.css`, `typography.css`, `pages.css`), card images from TCGdex and one small script, `pages.js`.

The pages are entry points from search engines, not a second way to browse. In the app a card always opens as a popover over the catalog. On these pages every card link (set grid, previous/next, other prints) is a real link to `/card/<id>/` for crawlers, but `pages.js` sends a visitor who clicks it into the app at `/?card=<id>&ui=en`, where the card opens as that popover. The start page footer's **All sets** link (`/sets/`) likewise opens the app's own sets view in place.

## Sitemaps

`dist/sitemap.xml` is a sitemap index of three sitemaps. `sitemap-site.xml` is committed: the hand-kept list of the start page and the legal and branding pages. The deploy builds the other two:

- `sitemap-sets.xml`: `/sets/` and every set page;
- `sitemap-cards-N.xml`: every card page, at most 40,000 addresses per file (below the 50,000 limit).

`robots.txt` names `https://bindtopia.com/sitemap.xml`. Add new hand-written pages to `sitemap-site.xml`.

## Build locally

```sh
node scripts/build-pages.mjs
```

This writes about 24,000 files into `dist/card/`, `dist/set/` and `dist/sets/` plus the two generated sitemaps, all ignored by git. It also rewrites `dist/sitemap.xml` with the same content; only past 40,000 cards would a second card sitemap appear there, and then the committed index must list it too. The end-to-end tests build the pages before serving the site.
