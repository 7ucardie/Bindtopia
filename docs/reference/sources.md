# Data, assets and network sources

| Source | Use | When requested |
| --- | --- | --- |
| Bundled English JSON index | Fast local catalog search | Portal load from its own host |
| TCGdex API | Other card-language indexes and full card details | Language change or opening a card |
| TCGdex assets | Original card images and set logos | When displayed |
| jsDelivr | Tesseract.js and recognition core/worker code | After selecting a photo for web OCR |
| tessdata.projectnaptha.com | OCR language models | When the chosen model is needed |
| GitHub Sponsors | Voluntary external support | User follows the link |
| External marketplaces | Card-price searches | User follows a price link |

App code does not upload the photo or OCR text. External requests still expose ordinary connection metadata to providers. There is no application analytics, embedded payment widget or remote Google Fonts loader. Roboto is self-hosted; exact Flexo remains dependent on licensed files.

Read the deployed privacy/cookie statements before public launch; operator details, hosting contracts and international-processing specifics remain incomplete. Native scanning uses Apple Vision locally, while native card images/details still load externally.

TCGdex's database license and original artwork rights are separate. See [third-party notices](../../THIRD_PARTY_NOTICES.md). Fan-made attribution does not grant missing rights.
