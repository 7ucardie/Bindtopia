# Publish the portal

The site is served from `dist/` by GitHub Pages at https://bindtopia.com.

1. Merge to `main` only when CI is green.
2. Run **Actions → Publish catalog to GitHub Pages → Run workflow**.
3. Verify the deployment result and URL. Test search, language, imports and a scan on a real phone.

For scheduled deployment from the daily catalog update, set the repository variable `PAGES_ENABLED` to `true`. GitHub Pages is public and serves static files only, not a collection database or server-side secrets.
