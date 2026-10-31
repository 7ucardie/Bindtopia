# Hosting van Bindtopia

## Architectuur

De portal bestaat uit statische HTML/CSS/JavaScript en een eigen JSON-kaartindex. Het Engelse zoeken en matchen werken in de browser. Kaartdetails, prijsindicaties en andere talen worden via TCGdex opgehaald; afbeeldingen staan bij TCGdex. OCR draait lokaal nadat herkenningsbestanden zijn geladen. De verzameling wordt lokaal opgeslagen. Een databaseserver is niet nodig.

## GitHub Pages

De site staat op https://bindtopia.com via GitHub Pages (bron: https://github.com/7ucardie/Bindtopia, branch `main`). De workflow `.github/workflows/github-pages.yml` publiceert de map `dist/`: vanzelf zodra CI op een push naar `main` groen is (alleen als die commit nog de nieuwste is), of handmatig via Run workflow. Settings → Pages → Source staat op "GitHub Actions"; het custom domain en Enforce HTTPS zijn in Settings → Pages ingesteld.

Na een wijziging:
1. CI draait (checks, unit-, integratie- en e2e-tests, npm audit, Gitleaks, Trivy).
2. Is CI groen, dan publiceert "Publish catalog to GitHub Pages" vanzelf. Bij rood wordt niets gepubliceerd.
3. Controleer de site, camera/fotokeuze, OCR en externe verzoeken op een echte telefoon.

GitHub Pages is openbaar. Zet geen persoonlijke gegevens, exports, tokens of sleutels in de bron of `dist/`. GitHub Pages is niet bedoeld als hosting voor een commerciële dienst; Bindtopia heeft geen verdienmodel.

## Wanneer wel een backend/database?

- Accounts en synchronisatie van een verzameling tussen web en iPhone.
- Delen of beheren van verzamelingen op meerdere apparaten.
- Server-side API-sleutels, eigen prijsfeed, centrale foto-opslag of achtergrondtaken.

De frontend kan statisch blijven, maar privégegevens horen dan achter authenticatie in een beheerde backend. Een GitHub-repository is geen geschikte gebruikersdatabase. Er is nu geen cloudverzameling.

## Automatische updates, Sponsors en analytics

De dagelijkse catalogusupdate staat in `.github/workflows/catalog-update.yml`. Die valideert de data voordat hij commit; heeft hij iets gecommit, dan publiceert `github-pages.yml` dat vanzelf (net als na de wekelijkse vingerafdrukken-run). Geen van beide omzeilt branchbeveiliging. Vrijwillige steun loopt via GitHub Sponsors en, zodra `kofiUsername` in `project.config.json` is ingevuld, via Ko-fi; de kosten onder *Kosten en steun* op de rechtenpagina komen uit `costs` in hetzelfde bestand. Draai daarna `node scripts/configure-project.mjs`. Cloudflare Web Analytics wordt actief zodra `cloudflareAnalyticsToken` in `project.config.json` is ingevuld en `node scripts/configure-project.mjs` is gedraaid. De juridische teksten worden bewaakt door `tests/integration/privacy.test.mjs`.

## DNS voor bindtopia.com

| Type | Naam | Waarde |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | 7ucardie.github.io |

Houd deze records op "DNS only" (grijze wolk) zodat GitHub het HTTPS-certificaat kan vernieuwen. Laat MX/TXT-records voor e-mail ongemoeid.

## Bronnen

- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
