# Update the catalog

Run from the repository root:

```sh
node scripts/sync-catalog.mjs
node scripts/check.mjs
node scripts/check-i18n.mjs
node scripts/check-sync.mjs
```

The updater fetches English cards and sets from TCGdex. It checks minimum coverage, unique IDs, set membership, image hosts and disappearance of existing IDs before writing. A rejected update needs source investigation; do not weaken the guards to hide a failure. Legitimate upstream removals require deliberate review.

The scheduled workflow runs daily at 05:23 UTC, subject to GitHub scheduling delays. Every successful run records the check date in `dist/data/meta.json` (`checked`), also when TCGdex has no new cards; `updated` changes only with the catalog itself. Each run also records `tcgdex`: the latest [TCGdex cards-database release](https://github.com/tcgdex/cards-database/releases) at that check (for example `2.49.0`), since the TCGdex API reports no version of its own; when GitHub cannot be reached the previous value stays. The site footer shows the check date and the catalog line shows that release ("Local TCGdex index v2.49.0, updated …"). It commits changed web/native indexes. Public repositories can have scheduled workflows disabled after 60 days without activity. Enable failure notifications in GitHub.

When the run committed new data, **Publish catalog to GitHub Pages** starts by itself and publishes it; without changes nothing is published. An installed native app receives a new bundled index only with a new app build.
