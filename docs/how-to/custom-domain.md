# Connect bindtopia.com

The domain has been registered by the owner; code configuration is prepared. DNS and GitHub Pages settings still need to be changed.

1. Verify ownership in the correct GitHub account.
2. Set **Settings → Pages → Custom domain** to `bindtopia.com` before pointing DNS to Pages. With Actions publishing, a CNAME file does not replace this setting.
3. At the DNS provider, configure the apex using the current GitHub Pages A/AAAA or ALIAS guidance. For `www`, use a CNAME to `7ucardie.github.io`, with no repository path.
4. Preserve unrelated MX/TXT records, wait for DNS checks, then enable **Enforce HTTPS** when available.
5. Check both the apex and www address and update public support/privacy URLs in the app when the new site is confirmed live.

The prepared record values are in [HOSTING.md](../../HOSTING.md). Consult the [GitHub domain instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site) when applying them. A generated CNAME is configuration, not a purchase or DNS change.
