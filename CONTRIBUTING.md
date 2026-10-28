# Contributing

Start with [AGENTS.md](AGENTS.md), the mandatory project design skill, [SPEC.md](SPEC.md) and [REVIEW.md](REVIEW.md). Work in a branch and make a reviewable pull request. Change publication, signing or release state only as requested.

## Checks

Run the checks affected by your change:

```sh
node scripts/check-syntax.mjs
node scripts/check.mjs
node scripts/check-i18n.mjs
node scripts/check-sync.mjs
node scripts/check-docs.mjs
```

Browser code in `dist/` is formatted with Prettier using `.prettierrc.json` (`npx prettier@3.3.3 --write "dist/*.mjs" dist/sw.js`); keep one module per part of the page and route shared state through `dist/state.mjs`.

The full suite (checks, unit, integration and Playwright end-to-end tests) runs with `npm ci && npx playwright install chromium && npm test`. CI runs the same suites plus `npm audit`, Gitleaks and Trivy; pin any new workflow action to a commit SHA.

Validate changed skill frontmatter with the available skill validator. Rebuild the source archive when its inputs change. Test UI changes in the island theme and at a phone-sized viewport; report when browser QA is unavailable. Native changes require a separate Xcode/device validation step.

## Implementation and evidence

Use the smallest complete change and reuse existing components. Preserve collection/import compatibility. Add meaningful regression coverage for changed behavior; do not weaken checks to conceal failures. Add all eight interface dictionary entries for new copy. Update the affected docs and SPEC.md rather than leaving contradictory instructions.

Do not introduce analytics, font-host requests, photo uploads or user accounts incidentally. Never commit secrets, signing files or personal collections. Keep original card art separate from generated backgrounds. Contribute only material you have rights to submit; the MIT license does not grant third-party Pokémon rights.

Use the PR template to explain the behavior, evidence, impact/reversibility and related issues. Record concrete verification limits without claiming unrun checks.
