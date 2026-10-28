# Bindtopia repository instructions

## Required first read

Before planning or implementing **any change in this repository**, read:

1. `.agents/skills/bindtopia-design/SKILL.md`
2. For every site/UI/branding change, also read `.agents/skills/bindtopia-design/references/design-system.md`.

This requirement applies to new features and pages as well as small styling, navigation, scanner, collection, localization and related iPhone changes. If these files are missing, recover them from version control before changing the site's design. Do not proceed from a generic Pokémon theme or an earlier design experiment.

Follow the approved Bindtopia design when adding components: the sunny island is the only theme (no dark theme or toggle), and the ocean-orb mark/wordmarks are the brand assets. Keep full original card images as independent UI layers. Treat an explicit new user design decision as an update to the baseline, and update the skill reference together with the implementation.

## Implementation

The web portal is buildless HTML/CSS/JavaScript in `dist/`. Read the affected files and reuse the existing components and theme tokens. Keep interface and card languages separate. Preserve local collection/import compatibility and local OCR; do not add external tracking, font requests or cloud photo processing as an incidental change.

Run the relevant existing checks; do not introduce a framework, package installation or lint pass for a small reversible change. For behavior changes, the available checks are:

- `node scripts/check-syntax.mjs`
- `node scripts/check.mjs`
- `node scripts/check-i18n.mjs`
- `node scripts/check-sync.mjs`
- `node scripts/check-docs.mjs`
- `npm run test:unit`, `npm run test:integration` and `npm run test:e2e` (after `npm ci`)

The source is published through the GitHub repository; there is no separate download archive.

Keep the current publication audience unless the user requests a change. Do not infer that a domain or configured repository is already deployed. Report actual GitHub/source push outcomes and any browser/native-build verification limits accurately.

## Documentation and review

Use the repository README structure and its accurate project badges. Keep user/developer docs in `docs/tutorials/`, `docs/how-to/`, `docs/reference/`, and `docs/explanation/`; start from `docs/README.md`. Update SPEC.md for material scope changes. Follow REVIEW.md and the PR template. Keep CLAUDE.md as a pointer to this shared policy, not a second design rulebook. Avoid references to unrelated example projects in user-facing docs.
