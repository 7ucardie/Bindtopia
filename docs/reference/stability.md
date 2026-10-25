# Stability

Bindtopia is a pre-release project. Preserve existing user data even while the public API and UI evolve.

| Surface | Compatibility expectation |
| --- | --- |
| Web collection storage | Keep the current version-2 key readable; migrate deliberately rather than silently losing cards |
| Backup import | Preserve version-2 import or provide an explicit migration |
| Card identity | Preserve source ID, language and string collector number semantics |
| Catalog update | Reject unexplained removals, duplicate IDs, incomplete payloads and unexpected image hosts |
| Theme URLs | Keep `poke-island` and `poke-holo` working |
| Interface dictionaries | Keep keys aligned across all eight languages; preserve English fallback |
| Design | Follow the mandatory project skill unless the user explicitly changes the approved baseline |

No current promise covers cloud synchronization, trading, a live valuation service, authenticity recognition or automatic updates to an already installed native app. Upstream catalog coverage and remote services may change independently. A future public semantic-versioning promise should be documented before it is advertised.
