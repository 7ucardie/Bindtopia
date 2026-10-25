# Security

## Reporting

If GitHub Private Vulnerability Reporting is enabled for this repository, use the Security tab's private reporting channel. Activation and a maintainer contact still need owner setup. Do not publish exploitable details, credentials or personal data in a public issue. The project does not currently promise a fixed response deadline or signed releases.

## What the application accesses

- **Reads locally:** the selected card photo, recognition text, filters and imported backup.
- **Writes locally:** the browser collection key and user-requested downloaded backup. The native app has separate local UserDefaults storage.
- **Network:** its host, TCGdex images/API, OCR program/language downloads and destinations the user opens. The application code does not upload photographs or OCR text.
- **Deletes:** its own collection keys after confirmation, or temporary scan state. It does not delete the original photo, separate backups or host authentication cookies.

Treat source data and imported JSON as untrusted. Preserve escaping, allowed image hosts and the import validation. Read [network sources](docs/reference/sources.md) and the deployed privacy statements for the current boundaries.

## Builds and automation

CI runs source/catalog/localization/update and documentation checks, unit, integration and end-to-end tests, `npm audit`, a Gitleaks secret scan and a Trivy vulnerability/secret/misconfiguration scan. All workflow actions are pinned to commit SHAs; Renovate keeps them and the npm lockfile current and merges updates only after CI passes. macOS signing and native compilation are not part of CI. Secrets and Apple signing files belong outside the repository and source archives.

## Downloads

Current downloads are source projects, not signed app installers. There is no published signed checksum manifest yet. See [verify a download](docs/how-to/verify-download.md).
