# Data, assets and network sources

| Source | Use | When requested |
| --- | --- | --- |
| Bundled English JSON index | Fast local catalog search | Portal load from its own host |
| TCGdex API | Other card-language indexes and full card details | Language change or opening a card |
| TCGdex assets | Original card images and set logos | When displayed |
| jsDelivr | Tesseract.js and recognition core/worker code | After selecting a photo for web OCR |
| tessdata.projectnaptha.com | OCR language models | When the chosen model is needed |
| Cloudflare Web Analytics | Cookieless visitor statistics (only with a configured token; off under Do Not Track / Global Privacy Control) | Page load |
| Ko-fi (and GitHub Sponsors once configured) | Voluntary gifts | User follows the link |
| TCGdex pricing field | Indicative Cardmarket/TCGplayer prices | Opening a card detail |
| Offline copy (service worker, Cache Storage on the device) | Site, English catalog, OCR files and viewed card details, prices and images, for use without internet | Saved while browsing; nothing is sent anywhere |
| External marketplaces | Card-price searches | User follows a price link |

App code does not upload the photo or OCR text. External requests still expose ordinary connection metadata to providers. Analytics is limited to cookieless Cloudflare Web Analytics. There is no embedded payment widget or remote Google Fonts loader. Roboto is self-hosted; exact Flexo remains dependent on licensed files.

The privacy and cookie statements on the site describe these requests, the operator (GitHub account 7ucardie) and the hosting. Native scanning uses Apple Vision locally, while native card images/details still load externally.

TCGdex's database license and original artwork rights are separate. See [third-party notices](../../THIRD_PARTY_NOTICES.md). Fan-made attribution does not grant missing rights.
