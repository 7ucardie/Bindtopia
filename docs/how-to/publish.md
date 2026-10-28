# Publish the portal

The site is served from `dist/` by GitHub Pages at https://bindtopia.com.

1. Push or merge to `main`. CI runs the checks, the tests and the security scans.
2. When CI is green, **Publish catalog to GitHub Pages** starts by itself and publishes that commit. It skips a commit that is no longer the newest on `main`; the newer commit is published after its own CI run. A red CI run publishes nothing.
3. Verify the deployment result and URL. Test search, language, imports and a scan on a real phone.

To publish without a new commit (for example after changing Pages settings), use **Actions → Publish catalog to GitHub Pages → Run workflow**.

The daily catalog update commits with the workflow token, which does not start CI; it validates the data itself and publishes when the repository variable `PAGES_ENABLED` is `true`. GitHub Pages is public and serves static files only, not a collection database or server-side secrets.
