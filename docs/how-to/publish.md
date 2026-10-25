# Publish the portal

## GitHub Pages

1. Deliver the source to `7ucardie/Bindtopia`; the integration currently lacks write access.
2. Finish launch conditions in SPEC.md, including operator/contact information, hosting disclosures and the rights basis for displayed artwork.
3. Select **Settings → Pages → GitHub Actions**.
4. For scheduled deployment, set the repository variable `PAGES_ENABLED` to `true`; otherwise run the manual Pages workflow when appropriate.
5. Verify the actual deployment result and URL. Test search, language, theme, imports and a scan on a real phone.

Pages is normally public, including when the source repository is private. Preserve the existing private preview until the user requests public launch. GitHub Pages serves static files, not a private collection database or server-side API secrets. Read its current usage limits before turning the project into a commercial transaction service.

## Current private hosting

The current preview has a separate hosting/source workflow. Preserve its project identity and audience. A successful source-host push is not proof that the github.com repository or its Actions were updated.
