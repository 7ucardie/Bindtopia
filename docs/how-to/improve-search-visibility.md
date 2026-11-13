# Improve search visibility

Bindtopia has no ads budget and no tracking, so visitors arrive through search and links. This page covers the manual work around the site: registering it with Google Search Console and Bing Webmaster Tools, earning honest links, and what to avoid. The robots file and the sitemap index are generated in the repository; everything below happens outside it.

## Verify bindtopia.com in Google Search Console

Use a **Domain property**, not a URL-prefix property. A Domain property covers the root domain, every subdomain and both http and https, so `bindtopia.com`, `www.bindtopia.com` and any old http links are reported together. A URL-prefix property covers only URLs that start with the exact prefix, including the protocol, so you would need one per variant. See [Add a website property](https://support.google.com/webmasters/answer/34592?hl=en).

A Domain property can only be verified with a DNS record. The site's DNS lives at the domain registrar or DNS provider that also holds the GitHub Pages records in [HOSTING.md](../../HOSTING.md).

1. Open [Search Console](https://search.google.com/search-console) with the Google account that should own the site. In the property selector, choose **+ Add property**, pick the **Domain** property type and enter `bindtopia.com` (no `www`, protocol or path).
2. Search Console selects **Domain name provider** verification. Choose **TXT** as the record type and copy the `google-site-verification=…` value.
3. At the DNS provider, add a **TXT** record with host/name `@` (or empty, depending on the provider) and paste the value. Add it next to the existing records: leave the GitHub Pages A/CNAME records, any `_github-pages-challenge` TXT record and mail MX/TXT records untouched. A domain can have several TXT records.
4. Return to Search Console and choose **Verify**. A new record can take up to two or three days to be served; if verification fails, wait and try again.
5. Keep the TXT record permanently. Removing it later can remove your verification.

Details: [Verify your site ownership](https://support.google.com/webmasters/answer/9008080?hl=en).

## Submit the sitemap index

`https://bindtopia.com/sitemap.xml` is the sitemap index: it lists the sitemaps for the site's pages, cards and sets, and is regenerated at deploy time. `robots.txt` already points to it. Submit only the index; Google reads the sitemaps it lists.

1. In Search Console, inspect `https://bindtopia.com/sitemap.xml` with the URL inspection bar, choose **Test live URL** and check that the page fetch succeeds.
2. Open the **Sitemaps** report (under **Indexing**), paste `https://bindtopia.com/sitemap.xml` into **Add a new sitemap** and choose **Submit**.
3. Check that the status becomes **Success** and the type **Sitemap index**. **Has errors** or **Couldn't fetch** means a problem with the deployed file; open the entry for details.

Google fetches the sitemap right away, but crawling the listed URLs takes time and not every URL is guaranteed to be crawled or indexed. See the [Sitemaps report](https://support.google.com/webmasters/answer/7451001?hl=en) and [sitemap index files](https://developers.google.com/search/docs/crawling-indexing/sitemaps/large-sitemaps). There is no need to resubmit after each deploy; Google rereads the index.

## Check the reports after one to two weeks

- **Page indexing report** ([help](https://support.google.com/webmasters/answer/7440203?hl=en)): compare indexed pages with the rows under **Why pages aren't indexed**. Use the sitemap filter (**All submitted pages**) to look only at URLs from the sitemap index. **Discovered – currently not indexed** means Google knows the URL but has not crawled it yet; on a new site with many card pages this is normal at first and shrinks as Google trusts the site more (links help). **Crawled – currently not indexed** means Google fetched the page and chose not to index it; if many card pages land here, check that they have unique titles, descriptions and useful text rather than near-identical templates. After fixing a real issue, use **Validate fix**.
- **Performance report** (search results): look at **Queries** and **Pages** for clicks, impressions, CTR and average position. Queries with many impressions but few clicks point to titles or descriptions worth improving.
- **Core Web Vitals report** ([help](https://support.google.com/webmasters/answer/9205520?hl=en)): it uses real-user Chrome data, so a new or low-traffic site often shows **No data available** for weeks. That is not an error. Once data exists, check mobile and desktop separately for **Poor** or **Need improvement** URL groups.
- **URL Inspection** ([help](https://support.google.com/webmasters/answer/9012289?hl=en)): take one card page URL from the sitemap index and inspect it. Check that it is on Google, that the **Google-selected canonical** matches the **User-declared canonical**, and use **Test live URL** → **View tested page** to confirm that the rendered HTML contains the card name and text. **Request indexing** has a small daily quota; use it for a few important pages, not for the whole catalog.

## Add Bing Webmaster Tools

Bing has its own index and its own webmaster tools. After Search Console is verified:

1. Sign in to [Bing Webmaster Tools](https://www.bing.com/webmasters).
2. On **My Sites**, choose **Import**, sign in with the Google account that owns the Search Console property and allow access.
3. Select bindtopia.com and choose **Import**. The site is verified automatically and its sitemaps come along.

Bing keeps checking ownership through Search Console; if that access is revoked, verify again with a DNS record. See [Import sites from Search Console](https://blogs.bing.com/webmaster/september-2019/Import-sites-from-Search-Console-to-Bing-Webmaster-Tools).

## Earn links honestly

Links from relevant sites help Google discover pages and judge whether a new site is worth indexing. For a free, non-commercial fan site, the best links come from being genuinely useful to collectors. Always say that you made Bindtopia.

- **Reddit TCG communities.** Read each subreddit's rules first; many limit self-promotion or allow tools only in a weekly thread. Post where it fits, explain what is free, local and ad-free, answer questions and accept criticism. Do not cross-post the same text to many subreddits.
- **Discord TCG servers.** Ask a moderator before posting a link, and use the channel they point you to (often a tools or resources channel).
- **Card-collector creators.** YouTubers, streamers and bloggers who cover binders, collection tracking or scanning may find the scanner useful. Send one short personal message; do not ask for a link in return for anything.
- **Local game stores.** Stores that run leagues or buy collections sometimes keep a page or board of useful tools. Offer it as a free help for their customers.
- **Lists and wikis.** Suggest Bindtopia for curated "awesome" lists on GitHub and for resource pages on TCG wikis, following each list's contribution rules (usually a pull request with a one-line description). Accept a "no".
- **This repository.** Keep the link to https://bindtopia.com in the README and the GitHub repository's website field.
- **TCGdex.** Bindtopia uses TCGdex data. If their community has a showcase of projects built on the API, ask whether Bindtopia may be listed there; report missing cards back to them as the site already encourages.

Do not buy or swap links, use link networks, post in comment sections only to drop a URL, or write or request fake reviews. Google treats links made to manipulate rankings as [link spam](https://developers.google.com/search/docs/essentials/spam-policies), and communities ban accounts for it.

## What not to do

Google's [spam policies](https://developers.google.com/search/docs/essentials/spam-policies) can demote or remove a whole site. In particular:

- **Keyword stuffing:** no lists of card names, "Pokémon card price scanner free" repetitions or hidden text added to rank. Write titles and descriptions for collectors.
- **Doorway pages:** no near-identical pages per city, language or search phrase that only funnel visitors to the main page. A card page should be useful on its own.
- **Copied text:** do not copy descriptions, guides or price commentary from other sites. Card data comes from TCGdex under its license (see [Sources](../reference/sources.md)); add value around it instead of scraping other catalogs.

The [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) describes the basics Google itself recommends.
