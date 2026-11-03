# ADR-001: Rust with macroquad

**Status:** accepted · **Context for:** the Claude Code Game Studios `/setup-engine` step. That framework ships
specialists for Godot, Unity and Unreal only, so Rust is configured by hand here.

## Decision

Use **Rust (stable)** with the **macroquad 0.4** engine, `serde`/`serde_json` for saves, and nothing else.

## Why

- **Mac support:** macroquad (via miniquad) runs natively on macOS, including Apple Silicon and Retina
  (`high_dpi`). It uses OpenGL, which macOS still provides; Apple deprecates it, so a future move to a
  Metal-based renderer is listed in the roadmap.
- **Fast builds, few dependencies:** a clean release build takes about 20–40 s and needs no system libraries on
  Linux or macOS.
- **Testability:** all game rules live in `sim.rs`, `data.rs`, `terrain.rs` and `save.rs`, which do not open a
  window. `cargo test` runs the full simulation headlessly (combat, AI, quests, saves, a class-balance bot).

## Alternatives considered

- **Bevy** — a richer ECS and renderer, but heavier compile times and frequent breaking releases. A good
  candidate when the project needs real assets, skeletal animation or networking; the headless simulation
  would move across unchanged.
- **Godot + godot-rust** — best tooling, but splits the code across two languages and an editor, against the
  "Rust, one codebase" goal.

## Consequences

- No built-in lighting, so shading is baked into vertex colours (`gfx.rs`); no audio crate is enabled.
- Text uses macroquad's built-in bitmap font.
