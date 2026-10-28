<p align="center"><img src="assets/bindtopia.png" width="150" alt="Bindtopia ocean-orb logo"></p>
<h1 align="center">Bindtopia</h1>
<p align="center">
  <a href="https://github.com/7ucardie/Bindtopia/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/7ucardie/Bindtopia/ci.yml?branch=main&label=CI&style=for-the-badge"></a>
  <a href="https://github.com/7ucardie/Bindtopia/releases"><img alt="Version: unreleased" src="https://img.shields.io/badge/version-unreleased-673AB7?style=for-the-badge"></a>
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-009688?style=for-the-badge"></a>
  <a href="docs/README.md"><img alt="Documentation: Diátaxis" src="https://img.shields.io/badge/docs-Di%C3%A1taxis-009485?logo=readthedocs&logoColor=white&style=for-the-badge"></a>
</p>
<p align="center">
  <a href="docs/reference/sources.md"><img alt="Card data: TCGdex" src="https://img.shields.io/badge/cards-TCGdex-0D65B5?style=for-the-badge"></a>
  <a href="docs/how-to/scan-a-card.md"><img alt="OCR: on device" src="https://img.shields.io/badge/OCR-on_device-176B61?style=for-the-badge"></a>
  <a href="docs/how-to/change-language.md"><img alt="Interface languages: 8" src="https://img.shields.io/badge/languages-8-126487?style=for-the-badge"></a>
  <a href="docs/reference/configuration.md"><img alt="Collection: local first" src="https://img.shields.io/badge/collection-local_first-40BDB3?style=for-the-badge"></a>
</p>
<p align="center">
  <a href="https://github.com/7ucardie/Bindtopia/issues"><img alt="Issues" src="https://img.shields.io/github/issues/7ucardie/Bindtopia?color=F44336&style=for-the-badge"></a>
  <a href="https://github.com/7ucardie/Bindtopia/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/7ucardie/Bindtopia?color=FFEB3B&style=for-the-badge"></a>
  <a href="https://github.com/7ucardie/Bindtopia/forks"><img alt="Forks" src="https://img.shields.io/github/forks/7ucardie/Bindtopia?color=2196F3&style=for-the-badge"></a>
  <a href="https://github.com/sponsors/7ucardie?metadata_project=Bindtopia"><img alt="Sponsor" src="https://img.shields.io/badge/sponsor-%E2%9D%A4-EA4AAA?logo=githubsponsors&logoColor=white&style=for-the-badge"></a>
</p>
<p align="center">
  <img alt="HTML5" src="https://img.shields.io/badge/HTML5-buildless-E34F26?logo=html5&logoColor=white&style=for-the-badge">
  <img alt="JavaScript ES modules" src="https://img.shields.io/badge/JavaScript-ES_modules-F7DF1E?logo=javascript&logoColor=black&style=for-the-badge">
  <img alt="SwiftUI development project" src="https://img.shields.io/badge/SwiftUI-development-F05138?logo=swift&logoColor=white&style=for-the-badge">
  <img alt="Web and iPhone" src="https://img.shields.io/badge/platform-web_%7C_iPhone-082C55?style=for-the-badge">
</p>

An ad-free Pokémon card catalog and collection companion. Explore cards, identify a card from a photo, save your favorites locally, and check prices at independent sources. Built as a static web portal with a native iPhone development project.

<p align="center"><img src="dist/assets/bindtopia-cinematic-day-1100.webp" alt="Approved Bindtopia daytime island artwork with the fan-made collector project title"></p>
<p align="center"><sub>Approved daytime brand artwork; not an application screenshot.</sub></p>

**Status:** live at [bindtopia.com](https://bindtopia.com) on GitHub Pages; no tagged release yet. Changes and the daily catalog update are published with the Pages workflow after CI passes. The site is run by the GitHub account 7ucardie (contact through GitHub Issues). Card images and card text belong to their rights holders; see the rights page on the site.

## What it does

- **Finds cards:** search the bundled English index or load another supported card language from TCGdex.
- **Trade mode:** point the phone at a card, see its price straight away, and keep a running give/get total at card shows and trades, also without internet after one visit (last known prices, kept on the device). Cards are recognised by their printed name and number and by their picture, which also finds the English print of a card in another language.
- **Reads a photo:** perform OCR on the device and suggest matches using the name and collector number.
- **Shows card details:** fetch set information, illustrator, HP, abilities and attacks when available.
- **Saves a collection:** use browser-local storage, with backup export/import and explicit deletion.
- **Prices by market:** indicative Cardmarket/TCGplayer prices from TCGdex, ordered for your market (US, UK, Australia, Canada, Europe or International) with approximate amounts in your local currency (ECB rates) and regional marketplace links; no price history or transaction handling.
- **Release years:** every card and set shows the year its set came out.
- **Public API and MCP server:** a free read-only JSON API at `bindtopia.com/api/v1/` and an MCP server so AI assistants can look up cards (see below).
- **Card text translation:** a button shows the official card text in the interface language when TCGdex has it.
- **Speaks eight interface languages:** Dutch, English, German, French, Spanish, Italian, Portuguese and Polish, with English fallback for untranslated text.
- **Updates the catalog:** a daily GitHub Actions workflow validates upstream data before committing it.
- **Includes an iPhone project:** SwiftUI, Apple Vision and a bundled English index. It is not built in CI, needs a Mac for signing and device tests, and does not yet have trade mode, market prices or picture recognition.

Photos and OCR text stay on the device in the application code. External image, data and OCR-file requests still occur; see [privacy and network behavior](docs/reference/sources.md).

## Install

**Web:** no npm installation or build step. Serve `dist/` over HTTP locally, for example:

```sh
git clone https://github.com/7ucardie/Bindtopia.git
cd Bindtopia
python3 -m http.server 8000 --directory dist
```

Open `http://localhost:8000`. Use HTTPS when hosting remotely; direct `file://` opening is unsuitable for modules and catalog fetches.

**iPhone:** open `ios/Bindtopia.xcodeproj` in Xcode on a Mac, choose your Apple Developer team and a unique bundle identifier, then run on an iOS 17+ device. Read the [iPhone instructions](ios/README.md). This is a development project, not a published App Store build.

## Use

1. Search by name, card ID or number such as `4/102`.
2. Choose the card language separately from the interface language.
3. Open a card for details; use its heart to save it.
4. Choose **Scan a card**, take/select a photo and verify the proposed matches.
5. Export a backup before deleting browser data.

The collection is local to the current browser. It is not automatically synchronized with another device or the native app.

## API and MCP server

**Public API.** Free, read-only JSON at `https://bindtopia.com/api/v1/` — no key, CORS enabled, OpenAPI 3.1 at [`/api/v1/openapi.json`](https://bindtopia.com/api/v1/openapi.json). See the [API reference](docs/reference/api.md) for endpoints and the usage policy.

```sh
curl https://bindtopia.com/api/v1/cards/base1-4.json
```

**MCP server.** Lets AI assistants such as Claude, Cursor or VS Code search the catalog. It runs locally over stdio, needs Node.js 22+, and reads the public API (plus TCGdex for card details and prices). It is hosted in this repository, so no npm account is needed.

| Tool | What it does |
| --- | --- |
| `search_cards` | Find cards by name, collector number (`4/102`) or card ID, typo-tolerant |
| `get_card` | Set, release year, images, HP, attacks, abilities and indicative prices; optional `market` (`us`, `gb`, `au`, `ca`, `de`, …) converts prices to that currency |
| `list_sets` | All sets with release date; filter by name or year |
| `get_set` | One set with all its cards |

Add it to **Claude Code**:

```sh
claude mcp add bindtopia -- npx -y github:7ucardie/Bindtopia
```

Or to **Claude Desktop, Cursor or VS Code** (`claude_desktop_config.json`, `.cursor/mcp.json` or `.vscode/mcp.json`):

```json
{
  "mcpServers": {
    "bindtopia": { "command": "npx", "args": ["-y", "github:7ucardie/Bindtopia"] }
  }
}
```

From a clone instead: `npm ci` and point the client at `node /path/to/Bindtopia/mcp/server.mjs`. Optional environment variables: `BINDTOPIA_API` (another API base URL) and `BINDTOPIA_TCGDEX` (another TCGdex base URL). Try it interactively with `npx @modelcontextprotocol/inspector node mcp/server.mjs`.

Example prompts: *"What year did Charizard 4/102 come out and what is it worth in pounds?"* · *"List all Pokémon sets from 1999."*

## Documentation

The docs use the Diátaxis structure. Start at [docs/README.md](docs/README.md).

- **Tutorial:** [Getting started](docs/tutorials/getting-started.md)
- **How-to:** [Scan a card](docs/how-to/scan-a-card.md) · [Trade mode](docs/how-to/trade-mode.md) · [Export and import](docs/how-to/export.md) · [Change language](docs/how-to/change-language.md) · [Change theme](docs/how-to/change-theme.md) · [Update the catalog](docs/how-to/update-catalog.md) · [Publish](docs/how-to/publish.md) · [Connect a domain](docs/how-to/custom-domain.md) · [Make a release](docs/how-to/release.md)
- **Reference:** [Public API](docs/reference/api.md) · [Commands](docs/reference/cli.md) · [Configuration](docs/reference/configuration.md) · [Card fields](docs/reference/card-fields.md) · [Sources](docs/reference/sources.md) · [Stability](docs/reference/stability.md)
- **Explanation:** [How Bindtopia works](docs/explanation/how-bindtopia-works.md)

## Roadmap

Scope and launch conditions are in [SPEC.md](SPEC.md).

**Next:** testing trade mode, camera and OCR on more real phones and webcams, and listing the API in public API directories. Complete Xcode validation before TestFlight.

**Later, if needed:** collection accounts and synchronization, richer collection views and more localization. These require explicit data-model and privacy work.

**Not currently implemented:** cloud collection storage, authentication inside the portal, photo uploads, grading, authenticity verification, a live valuation feed, or marketplace purchases.

## Support

The original code is MIT-licensed. Support development through [GitHub Sponsors](https://github.com/sponsors/7ucardie?metadata_project=Bindtopia). Sponsoring is voluntary and does not unlock exclusive catalog functionality. The account's Sponsors activation still needs owner verification.

## Backers

Thank you to everyone supporting the project. No backers are listed yet.

## License

Original code and documentation: [MIT](LICENSE). See [third-party notices](THIRD_PARTY_NOTICES.md) for card data, artwork, fonts and other dependencies. The software license grants no Pokémon trademark or artwork rights. This is an independent fan-made project.
