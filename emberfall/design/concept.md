# Emberfall — game concept

*Written with the Claude Code Game Studios workflow (concept → architecture decision → vertical slice).*

## Pitch

A single-player, third-person fantasy RPG that captures the moment-to-moment loop of an MMO: pick a class, leave
the safe village, fight creatures by level, loot corpses, accept quests, level up. Emberfall is an **original
world and ruleset**; it contains no names, art or data from any existing game.

## Pillars

1. **The MMO loop, instantly.** Quest → hunt → loot → level within the first minute of play.
2. **Readable combat.** Tab-targeting, a global cooldown, cast times that movement interrupts, resources with
   distinct feel (Rage builds, Mana drains).
3. **Risk and reward by level colour.** Grey / green / yellow / orange / red tells you what you can take on.
4. **Plays anywhere Rust does.** One codebase for macOS, Linux and Windows; no external assets to install.

## The vertical slice (v0.1)

| Area | Included |
| --- | --- |
| World | Cinderhold Vale, a 200 × 200 zone: safe village, boar meadow, wolf forest, bandit camp, boss den |
| Classes | Emberguard (Rage, melee), Stormcaller (Mana, ranged), Lightwarden (Mana, shield and heal) |
| Combat | Tab/click targeting, GCD, cast bars, cooldowns, DoTs, slows, roots, absorb shields, crits, auto-attack |
| Creatures | Four kinds with aggro radius by level difference, leash and evade, respawn; one elite boss |
| Progression | Levels 1–10, XP with grey-level falloff, gear that auto-equips on upgrade |
| Quests | A four-quest chain with kill objectives, XP/gold/item rewards |
| Economy | Corpse loot, junk items, a vendor who buys them |
| Persistence | JSON character save (autosave, F5, on quit) |
| UI | Unit frames, action bar with tooltips, cast bar, minimap, quest tracker, bags, quest log, floating combat text |

## Not in v0.1 (and why)

- **Multiplayer / a persistent shared world.** That needs an authoritative server, accounts, anti-cheat and
  hosting; it is a separate project. The simulation (`src/sim.rs`) is deliberately free of rendering and input so it
  can later run on a server. See the roadmap in `docs/roadmap.md`.
- **Audio, animation rigs, authored art.** Characters are procedurally assembled low-poly figures.
- **Dungeons, professions, PvP, more zones.**
