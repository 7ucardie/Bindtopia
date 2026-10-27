# Use trade mode

Trade mode is for card shows and trading tables: point your phone at a card, see its price at once, and keep a running total of what you give and what you get.

1. Choose the right **card language** first (the catalog and text recognition follow it).
2. Choose **⇄ Trade mode** next to *Scan a card* and allow camera access.
3. Hold one card inside the card-shaped guide, straight and well lit, with the name in the top zone and the collector number in a bottom corner zone. Only the area inside the guide is read.
4. Under the status line, distance advice appears after every attempt: *Come a bit closer*, *A bit further away*, *I can't see any text yet* or *Distance is good*. It is based on the size of the text that was read. The status line shows what is happening: the dot pulses blue while it reads, *Attempt n* counts the tries, and the thin bar shows the progress of each read. The first start downloads the recognition files and takes longer.
5. When the card is recognised (name and number, or number and set total) the dot turns green and the card appears with its year and headline price. Choose **+ I get** or **+ I give**, or **Scan next**. *Not this one?* lists other cards with the same name or number.
6. If nothing is found after a few tries, a remark explains what to change; scanning continues. You can always type the name and number (for example `Charizard 4/102`) instead. A name alone shows a list to pick from.
7. The lists show each card's price and the totals. The balance line says which side gets more value. Cards without a price or exchange rate are listed but not counted, and the line says how many.

The headline price follows your **market**: TCGplayer market price first for the US, Canada and Australia, Cardmarket trend first for the UK and Europe, converted to your currency with ECB rates where needed. Prices are indications from TCGdex and can be a day old; check variant (holo, reverse holo, 1st edition) and condition yourself.

Each attempt first compares the **picture** inside the guide with fingerprints of all catalog cards (`dist/data/fingerprints-en.json`, built by the fingerprint workflow); a close, clear match counts as found straight away and is marked *Recognised by the picture*. This also works for cards in another language whose artwork matches an English print, which is then shown with its price and marked *English print with the same artwork*. If the picture is not decisive, the text is read; when only the name is readable, the picture picks the right print among cards with that name. Text reading alternates between a black-and-white read (best for the small collector number) and a greyscale read. Everything runs on the device. Variants with the same artwork (holo, reverse holo, 1st edition) cannot be told apart by the picture; cards without a catalog image (about 1,750) can only be found by text. The camera image never leaves the device, and the trade list disappears when you close or reload the page.
