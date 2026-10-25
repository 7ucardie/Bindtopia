# Hosting van Bindtopia

## Huidige architectuur

De portal bestaat uit statische HTML/CSS/JavaScript en een eigen JSON-kaartindex. Het Engelse zoeken en matchen werken in de browser. Kaartdetails en andere talen worden via TCGdex opgehaald; afbeeldingen staan bij TCGdex. OCR draait lokaal nadat herkenningsbestanden zijn geladen. De verzameling wordt lokaal opgeslagen. Een databaseserver is hiervoor niet nodig.

## GitHub Pages

De map `dist/` is geschikt voor GitHub Pages, inclusief hosting onder een projectpad; interne verwijzingen zijn relatief. De meegeleverde workflow `.github/workflows/github-pages.yml` draait uitsluitend handmatig en is nog niet op GitHub uitgevoerd.

Voor een migratie:
1. Kies een eigen GitHub-repository en publicatie-audience. De huidige Sites-repository is geen al ingerichte repository op github.com.
2. Rond de conceptteksten af met beheerder, contact, hostingdetails, logtermijnen en de gebruiksgrond voor kaartafbeeldingen. Werk de privacyverklaring bij van ChatGPT Sites naar GitHub Pages en vermeld dat GitHub IP-adressen voor beveiliging logt.
3. Push de bron naar de gekozen repository, selecteer Settings → Pages → GitHub Actions en start de workflow handmatig.
4. Controleer de gepubliceerde URL, camera/fotokeuze, OCR-worker en externe API-verzoeken op de echte iPhone.

GitHub Pages is doorgaans openbaar, ook als de bronrepository privé is. Behoud de huidige privéhosting als alleen de eigenaar de portal mag openen. Zet geen persoonlijke gegevens, exports, tokens of sleutels in de bron of `dist/`. Gratis GitHub Pages vanuit een persoonlijke Free-account vereist een openbare repository. GitHub Pages is niet bedoeld/toegestaan als gratis hosting voor een online bedrijf, e-commerce of een dienst die primair commerciële transacties of commerciële SaaS faciliteert. Beoordeel een commerciële versie dus opnieuw; GitHub kan wel de broncode blijven hosten met productiehosting elders.

## Wanneer wel een backend/database?

- Accounts en synchronisatie van een verzameling tussen web en iPhone.
- Delen, wijzigen of verwijderen van verzamelingen op meerdere apparaten.
- Server-side API-sleutels, eigen prijsfeed, centrale foto-opslag of achtergrondtaken.

Bijvoorbeeld: de bestaande Sites-hosting met D1 of een andere beheerde backend. De frontend kan statisch blijven, maar privégegevens horen achter authenticatie en toegangsregels in de backend. Een GitHub-repository is geen geschikte live gebruikersdatabase. Voeg alleen een backend toe wanneer die functionaliteit nodig is; er is nu geen cloudverzameling.

## Bronnen

- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits

## Automatische updates en Sponsors (voorbereid)

De dagelijkse workflow staat in `.github/workflows/catalog-update.yml` en de sponsorconfiguratie in `.github/FUNDING.yml`. `project.config.json` richt deze op account `7ucardie`, met voorgestelde repositorynaam `bindtopia`. De doelrepository is https://github.com/7ucardie/Bindtopia. De dagelijkse workflow wordt actief zodra de bron op de default branch staat. De huidige privéhosting ontvangt geen updates van een nog niet bestaande GitHub-run.

Na het verbinden met GitHub: zet Actions-lees-/schrijfrechten voor de bot aan indien het accountbeleid dit vereist. Controleer of de Sponsors-pagina van de eigenaar actief is. Zet voor automatische Pages-publicatie de repositoryvariabele `PAGES_ENABLED=true`. De workflow valideert de data voordat hij ze commit en publiceert. Voor een beschermde default branch moet je de botrechten of een PR-proces passend inrichten; de workflow omzeilt geen branchbeveiliging.

De geregistreerde domeinnaam bindtopia.com is als doel ingesteld. DNS en GitHub Pages-instellingen zijn nog niet gewijzigd. Bij publicatie via GitHub Actions is het CNAME-bestand alleen een hulpmiddel voor andere publicatiemethoden; de custom domain moet ook expliciet in Settings → Pages worden ingesteld. Verifieer het domein in het juiste GitHub-account en voeg het in Pages toe voordat je DNS koppelt. Controleer ook support-/privacy-URL’s in de iPhone-app bij verhuizing. De conceptprivacyverklaring noemt nog de huidige Sites-hosting en moet voor een openbare GitHub-versie worden aangepast.

## DNS voor bindtopia.com

Stel eerst bindtopia.com in bij Settings → Pages → Custom domain en verifieer het domein in het GitHub-account. Daarna bij de DNS-provider:

| Type | Naam | Waarde |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | 7ucardie.github.io |

Gebruik geen repositorypad in het CNAME-doel. Laat bestaande MX/TXT-records voor e-mail ongemoeid. Zet Enforce HTTPS aan zodra GitHub het certificaat heeft uitgegeven. Er zijn in deze sessie geen DNS-records aangepast.
