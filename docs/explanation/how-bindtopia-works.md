# How Bindtopia works

## Static frontend, local collection

The web portal is HTML, CSS and JavaScript with a bundled JSON search index. It can run on static hosting without an application database. Local storage holds saved cards; this keeps the current collection flow simple and avoids uploading a personal collection by default. It also means the collection does not automatically follow a user across devices.

## Source data and identification

TCGdex supplies catalog records and card images. Opening a card fetches richer information, including indicative Cardmarket/TCGplayer prices supplied by TCGdex when available. A translate button fetches the same card in the interface language (official text, not machine translation) and can switch back to the original; a price button opens an independent search page. Neither a collector number nor an image match alone proves a physical card's authenticity or edition.

OCR turns a selected photograph into text locally. The matcher combines names, collector numbers and set totals and keeps alternative candidates when ambiguous. Card language chooses the OCR model; interface language chooses labels. Preserving Unicode lets Japanese names participate in matching.

## Image layers and design

The island is background/brand artwork. Original full card images remain independent elements positioned by CSS. Functional text, forms and interactions remain HTML. The single island theme is governed by the required repository design skill.

## Updates and hosting

The site runs on GitHub Pages at bindtopia.com. The daily workflow fetches and validates source data, and updates the checked-in web/native indexes; it also publishes when `PAGES_ENABLED` is set. Code changes are published with the Pages workflow after CI passes. Neither bypasses repository permissions.

A backend is warranted when accounts, shared collections or cross-device synchronization become requirements. That would require explicit authentication, authorization, retention and privacy design rather than replacing local storage incidentally.
