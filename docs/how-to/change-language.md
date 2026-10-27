# Change language

Use the globe selector for **interface language**: Dutch, English, German, French, Spanish, Italian, Portuguese or Polish. English is the default for every visitor, whatever the browser language. A language you pick is remembered in this browser (localStorage key `bindtopia-interface-language`) and shown in the URL, for example `?ui=fr`; a `?ui=` link always wins.

Choose **card language** in the sidebar separately. The list comes from `dist/data/languages.json`, which the daily catalog job measures against TCGdex: every language TCGdex accepts (English, French, Spanish, Italian, Portuguese, German, Dutch, Polish, Russian, Japanese, Korean, Traditional and Simplified Chinese, Indonesian, Thai) is offered once its catalog has at least 300 cards. Coverage still differs per language, and prices exist only for cards sold on Cardmarket or TCGplayer. The scanner chooses its OCR model using the card language (for example `chi_tra` for Traditional Chinese, `kor` for Korean); choose the card's language before scanning a non-English card. Official card names and descriptions are not rewritten into the interface language.

Legal information is currently available in Dutch and English. The native iPhone development project is not fully localized yet.
