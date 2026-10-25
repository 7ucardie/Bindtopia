# Card and collection fields

The English index uses TCGdex brief-card data plus the locally derived set ID.

| Field | Meaning |
| --- | --- |
| `id` | Global source card ID, such as `base1-4` |
| `localId` | Collector number within its set; keep as a string |
| `name` | Official card name in the selected catalog language |
| `image` | Optional source image base URL; no extension/quality suffix yet |
| `setId` | Set prefix derived from the global card ID |
| `lang` | Language attached in the app to distinguish saved records |
| `setName` | Optional set label saved with a collection record |

Details such as HP, illustrator, category, rarity, attacks and abilities are requested when opening a card; not every record includes every field. Do not confuse collector numbers, print variants or marketplace search results with a unique authenticated physical card.

The web backup envelope has `version: 2`, `exportedAt` and `cards`. Import validates records and merges by language/card ID. Card numbers may contain prefixes and must not be coerced globally to integers.
