# Emberfall

Een eigen, originele fantasy-RPG in **Rust**, geïnspireerd op de speelloop van een MMO: kies een klasse, verlaat het
veilige dorp, vecht tegen wezens op jouw level, plunder lijken, doe quests en groei in level. Draait native op
**macOS** (Apple Silicon en Intel), Linux en Windows.

Dit is een **singleplayer vertical slice**, geen online wereld. Alle namen, figuren en regels zijn origineel; er is
niets overgenomen uit een bestaande game. Zie [het concept](design/concept.md) en de [roadmap](docs/roadmap.md).

## Spelen op de Mac

1. Installeer Rust: <https://rustup.rs> (en eventueel `xcode-select --install` voor de linker).
2. In deze map:

   ```sh
   cargo run --release
   ```

3. Wil je een dubbelklikbare app? `./scripts/bundle-macos.sh` maakt `target/release/Emberfall.app`. De app is niet
   ondertekend: de eerste keer rechtsklikken → **Open**.

Je voortgang wordt opgeslagen in `~/Library/Application Support/Emberfall/save.json` (Linux:
`~/.local/share/emberfall/`, Windows: `%APPDATA%\Emberfall\`). Met `EMBERFALL_SAVE=/pad/naar/save.json` kies je
een ander bestand.

## Besturing

| Toets | Actie |
| --- | --- |
| W A S D | lopen (relatief aan de camera) |
| Rechtermuisknop vasthouden / pijltjes | camera draaien; het personage kijkt mee |
| Muiswiel | in- en uitzoomen |
| Spatie | springen |
| Tab of linkermuisknop | vijand selecteren (Esc wist) |
| 1 – 4 of klik op de actiebalk | vaardigheden |
| Q | automatische aanval aan/uit |
| F (of E) | praten met een NPC / lijk plunderen |
| I, L, H | tassen en uitrusting, questlog, hulp |
| R | na je dood terugkeren naar Cinderhold |
| F5 | opslaan (ook automatisch) |

Praat met **Warden Maren** in het dorp voor je eerste quest. Let op de kleur van de naam van een vijand: grijs is
gemakkelijk, geel is gelijkwaardig, rood is levensgevaarlijk. In het dorp ben je veilig; Tolly Brass koopt je
rommel.

## De klassen

| Klasse | Hulpbron | Stijl |
| --- | --- | --- |
| Emberguard | Woede (bouwt op door te vechten) | Melee, Rush-aanval, bloeding, zelfgenezing |
| Stormcaller | Mana | Bliksemsnelle bolts, Frost Nova, Blink |
| Lightwarden | Mana | Smite, zelf-heal, absorptieschild, schaduw-DoT |

## Ontwikkelen

```sh
cargo test                          # 27 tests: gevechten, AI, quests, opslag, balans-bot
cargo clippy --all-targets -- -D warnings
cargo fmt --check
EMBERFALL_SHOTS=/tmp/shots cargo run   # speelt een kort script af en schrijft screenshots (ontwikkelhulp)
```

| Bestand | Rol |
| --- | --- |
| `src/sim.rs` | spelregels: speler, wezens, gevecht, loot, quests (geen graphics, volledig getest) |
| `src/data.rs` | klassen, vaardigheden, items, wezens, quests, XP-curve |
| `src/terrain.rs` | procedureel terrein |
| `src/gfx.rs`, `src/render.rs` | low-poly meshes en scène |
| `src/ui.rs`, `src/app.rs` | HUD, invoer, camera, hoofdlus |
| `src/save.rs` | opslaan en laden |

Het ontwerp volgt de werkwijze van [Claude Code Game Studios](https://github.com/Donchitos/Claude-Code-Game-Studios)
(concept → architectuurbesluit → vertical slice); zie [ADR-001](docs/adr-001-engine.md).

## Status en beperkingen

- Gebouwd en getest op Linux (inclusief headless render-controle). De macOS-build is alleen via CI
  (`.github/workflows/emberfall.yml`) en op jouw Mac te verifiëren; ik heb het hier niet op echte Mac-hardware
  kunnen draaien.
- macroquad gebruikt OpenGL, dat macOS nog ondersteunt maar Apple als verouderd beschouwt.
- Geen geluid, geen multiplayer.

Licentie: MIT (zie [LICENSE](../LICENSE)).
