# Update the catalog

Run from the repository root:

```sh
node scripts/sync-catalog.mjs
node scripts/check.mjs
node scripts/check-i18n.mjs
node scripts/check-sync.mjs
```

The updater fetches English cards and sets from TCGdex. It checks minimum coverage, unique IDs, set membership, image hosts and disappearance of existing IDs before writing. A rejected update needs source investigation; do not weaken the guards to hide a failure. Legitimate upstream removals require deliberate review.

The prepared scheduled workflow runs daily at 05:23 UTC, subject to GitHub scheduling delays, once present on the default branch. It commits changed web/native indexes. Public repositories can have scheduled workflows disabled after 60 days without activity. Enable failure notifications in GitHub.

Set `PAGES_ENABLED=true` only after configuring GitHub Pages if this same run should publish. The registered domain and workflow file alone do not activate hosting. An installed native app receives a new bundled index only with a new app build.
