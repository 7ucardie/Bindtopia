//! 2D heads-up display drawn on top of the 3D world.

use crate::data::*;
use crate::sim::*;
use macroquad::prelude::*;
use std::collections::VecDeque;

pub struct FloatText {
    pub pos: Vec3,
    pub text: String,
    pub color: Color,
    pub age: f32,
    pub big: bool,
}

pub struct UiState {
    pub log: VecDeque<(String, LogKind)>,
    pub floats: Vec<FloatText>,
    pub bolts: Vec<(Vec3, Vec3, Color, f32)>,
    pub rings: Vec<(Vec3, f32, Color, f32)>,
    pub show_inv: bool,
    pub show_quests: bool,
    pub show_help: bool,
    pub dialog: Option<(String, String)>,
    pub banner: Option<(String, f32)>,
    pub toast: Option<(String, f32)>,
}

impl UiState {
    pub fn new() -> UiState {
        UiState {
            log: VecDeque::new(),
            floats: Vec::new(),
            bolts: Vec::new(),
            rings: Vec::new(),
            show_inv: false,
            show_quests: false,
            show_help: true,
            dialog: None,
            banner: None,
            toast: None,
        }
    }

    /// Consume the simulation events into UI state.
    pub fn absorb(&mut self, events: Vec<Event>) {
        for e in events {
            match e {
                Event::Float { pos, text, kind } => {
                    let (color, big) = match kind {
                        FloatKind::Damage => (Color::new(1.0, 0.95, 0.75, 1.0), false),
                        FloatKind::Crit => (Color::new(1.0, 0.75, 0.15, 1.0), true),
                        FloatKind::Taken => (Color::new(1.0, 0.3, 0.25, 1.0), false),
                        FloatKind::Heal => (Color::new(0.4, 1.0, 0.45, 1.0), false),
                        FloatKind::Info => (Color::new(0.75, 0.85, 1.0, 1.0), false),
                    };
                    self.floats.push(FloatText {
                        pos,
                        text,
                        color,
                        age: 0.0,
                        big,
                    });
                }
                Event::Log { text, kind } => {
                    self.log.push_back((text, kind));
                    while self.log.len() > 60 {
                        self.log.pop_front();
                    }
                }
                Event::LevelUp(l) => self.banner = Some((format!("LEVEL {l}!"), 3.0)),
                Event::PlayerDied => self.dialog = None,
                Event::Dialog { speaker, text } => self.dialog = Some((speaker, text)),
                Event::Bolt { from, to, color } => {
                    self.bolts
                        .push((from, to, Color::from_rgba(color[0], color[1], color[2], 255), 0.0))
                }
                Event::Ring { pos, radius, color } => {
                    self.rings
                        .push((pos, radius, Color::from_rgba(color[0], color[1], color[2], 255), 0.0))
                }
            }
        }
    }

    pub fn tick(&mut self, dt: f32) {
        for f in &mut self.floats {
            f.age += dt;
        }
        self.floats.retain(|f| f.age < 1.4);
        for b in &mut self.bolts {
            b.3 += dt;
        }
        self.bolts.retain(|b| b.3 < 0.25);
        for r in &mut self.rings {
            r.3 += dt;
        }
        self.rings.retain(|r| r.3 < 0.5);
        if let Some((_, t)) = &mut self.banner {
            *t -= dt;
        }
        if matches!(self.banner, Some((_, t)) if t <= 0.0) {
            self.banner = None;
        }
        if let Some((_, t)) = &mut self.toast {
            *t -= dt;
        }
        if matches!(self.toast, Some((_, t)) if t <= 0.0) {
            self.toast = None;
        }
    }
}

impl Default for UiState {
    fn default() -> Self {
        UiState::new()
    }
}

/// Project a world point to screen coordinates (logical pixels), or None if behind the camera.
pub fn project(m: Mat4, p: Vec3) -> Option<Vec2> {
    let c = m * vec4(p.x, p.y, p.z, 1.0);
    if c.w <= 0.05 {
        return None;
    }
    let (nx, ny) = (c.x / c.w, c.y / c.w);
    if nx.abs() > 1.3 || ny.abs() > 1.3 {
        return None;
    }
    Some(vec2(
        (nx * 0.5 + 0.5) * screen_width(),
        (0.5 - ny * 0.5) * screen_height(),
    ))
}

pub struct Gui {
    pub s: f32,
}

fn col(c: [u8; 3]) -> Color {
    Color::from_rgba(c[0], c[1], c[2], 255)
}

pub fn level_color(player_level: u32, mob_level: u32) -> Color {
    let d = mob_level as i32 - player_level as i32;
    if d <= -5 {
        Color::new(0.6, 0.6, 0.6, 1.0)
    } else if d <= -3 {
        Color::new(0.4, 0.9, 0.4, 1.0)
    } else if d <= 2 {
        Color::new(1.0, 0.9, 0.3, 1.0)
    } else if d <= 4 {
        Color::new(1.0, 0.55, 0.15, 1.0)
    } else {
        Color::new(1.0, 0.2, 0.2, 1.0)
    }
}

impl Default for Gui {
    fn default() -> Self {
        Gui::new()
    }
}

impl Gui {
    pub fn new() -> Gui {
        Gui {
            s: (screen_height() / 810.0).clamp(0.7, 3.0),
        }
    }

    pub fn text(&self, t: &str, x: f32, y: f32, size: f32, c: Color) {
        let size = (size * self.s).round().max(8.0);
        draw_text(
            t,
            x.round() + 1.0,
            y.round() + 1.0,
            size,
            Color::new(0.0, 0.0, 0.0, 0.8 * c.a),
        );
        draw_text(t, x.round(), y.round(), size, c);
    }

    pub fn width(&self, t: &str, size: f32) -> f32 {
        measure_text(t, None, (size * self.s).round().max(8.0) as u16, 1.0).width
    }

    pub fn text_c(&self, t: &str, cx: f32, y: f32, size: f32, c: Color) {
        let w = self.width(t, size);
        self.text(t, cx - w / 2.0, y, size, c);
    }

    pub fn panel(&self, x: f32, y: f32, w: f32, h: f32) {
        draw_rectangle(x, y, w, h, Color::new(0.04, 0.05, 0.08, 0.82));
        draw_rectangle_lines(x, y, w, h, 2.0, Color::new(0.75, 0.6, 0.3, 0.9));
    }

    pub fn bar(&self, x: f32, y: f32, w: f32, h: f32, frac: f32, c: Color) {
        draw_rectangle(x, y, w, h, Color::new(0.0, 0.0, 0.0, 0.7));
        draw_rectangle(
            x + 1.0,
            y + 1.0,
            ((w - 2.0) * frac.clamp(0.0, 1.0)).max(0.0),
            h - 2.0,
            c,
        );
        draw_rectangle_lines(x, y, w, h, 1.0, Color::new(0.0, 0.0, 0.0, 0.9));
    }

    pub fn inside(&self, x: f32, y: f32, w: f32, h: f32) -> bool {
        let (mx, my) = mouse_position();
        mx >= x && mx <= x + w && my >= y && my <= y + h
    }

    // ------------------------------------------------------------ the HUD

    pub fn draw_world_labels(&self, w: &World, ui: &UiState, m: Mat4) {
        let s = self.s;
        let p = &w.player;
        for (i, mob) in w.mobs.iter().enumerate() {
            let dist = (mob.pos - p.pos).length();
            if mob.state == MobState::Dead {
                if mob.loot.is_some() && dist < 14.0 {
                    if let Some(sp) = project(m, mob.pos + vec3(0.0, 2.0, 0.0)) {
                        self.text_c("Loot", sp.x, sp.y, 16.0, Color::new(1.0, 0.85, 0.3, 1.0));
                    }
                }
                continue;
            }
            let is_target = p.target == Some(i);
            if dist > 32.0 && !is_target {
                continue;
            }
            let head = mob.pos + vec3(0.0, 2.1 * mob.kind.scale().max(0.9) + 0.3, 0.0);
            let Some(sp) = project(m, head) else { continue };
            let lc = level_color(p.level, mob.level);
            let name = if mob.kind.elite() {
                format!("{} (Elite)", mob.kind.name())
            } else {
                mob.kind.name().to_string()
            };
            self.text_c(&name, sp.x, sp.y - 14.0 * s, 15.0, lc);
            if mob.hp < mob.max_hp || is_target || mob.state == MobState::Chase {
                self.bar(
                    sp.x - 34.0 * s,
                    sp.y - 10.0 * s,
                    68.0 * s,
                    7.0 * s,
                    mob.hp / mob.max_hp,
                    Color::new(0.8, 0.15, 0.12, 1.0),
                );
            }
        }
        for n in &w.npcs {
            let Some(sp) = project(m, n.pos + vec3(0.0, 2.9, 0.0)) else {
                continue;
            };
            if (n.pos - p.pos).length() > 45.0 {
                continue;
            }
            self.text_c(n.name, sp.x, sp.y - 14.0 * s, 16.0, Color::new(0.5, 1.0, 0.5, 1.0));
            self.text_c(
                &format!("<{}>", n.title),
                sp.x,
                sp.y,
                13.0,
                Color::new(0.8, 0.9, 0.8, 1.0),
            );
            if let Some(mk) = w.npc_marker(n) {
                let bob = (get_time() as f32 * 3.0).sin() * 4.0 * s;
                self.text_c(
                    &mk.to_string(),
                    sp.x,
                    sp.y - 34.0 * s + bob,
                    40.0,
                    Color::new(1.0, 0.85, 0.1, 1.0),
                );
            }
        }
        for f in &ui.floats {
            let rise = f.age * 1.6;
            if let Some(sp) = project(m, f.pos + vec3(0.0, rise, 0.0)) {
                let a = (1.4 - f.age).clamp(0.0, 1.0).min(1.0);
                let mut c = f.color;
                c.a = a;
                let size = if f.big { 30.0 } else { 20.0 };
                self.text_c(&f.text, sp.x, sp.y, size, c);
            }
        }
    }

    pub fn draw_hud(&self, w: &World, ui: &UiState, cam_yaw: f32) {
        let s = self.s;
        let (sw, sh) = (screen_width(), screen_height());
        let p = &w.player;
        let now = w.time;

        // ---- player frame
        let (px, py, pw, ph) = (14.0 * s, 14.0 * s, 250.0 * s, 78.0 * s);
        self.panel(px, py, pw, ph);
        let cc = col(p.class.color());
        self.text(
            &format!("{}  Lv {}", p.class.name(), p.level),
            px + 10.0 * s,
            py + 22.0 * s,
            20.0,
            cc,
        );
        self.bar(
            px + 10.0 * s,
            py + 30.0 * s,
            pw - 20.0 * s,
            16.0 * s,
            p.hp / p.max_hp(),
            Color::new(0.2, 0.75, 0.25, 1.0),
        );
        if p.shield > 0.0 && now < p.shield_until {
            let f = (p.shield / p.max_hp()).min(1.0);
            draw_rectangle(
                px + 11.0 * s,
                py + 31.0 * s,
                (pw - 22.0 * s) * f,
                4.0 * s,
                Color::new(1.0, 1.0, 1.0, 0.8),
            );
        }
        self.text_c(
            &format!("{} / {}", p.hp.ceil() as i32, p.max_hp() as i32),
            px + pw / 2.0,
            py + 43.0 * s,
            14.0,
            WHITE,
        );
        let rc = match p.class.resource() {
            Resource::Rage => Color::new(0.85, 0.2, 0.15, 1.0),
            Resource::Mana => Color::new(0.2, 0.4, 0.95, 1.0),
        };
        self.bar(
            px + 10.0 * s,
            py + 52.0 * s,
            pw - 20.0 * s,
            14.0 * s,
            p.res / p.max_res(),
            rc,
        );
        self.text_c(
            &format!("{} {}", p.res.floor() as i32, p.class.resource().name()),
            px + pw / 2.0,
            py + 63.0 * s,
            13.0,
            WHITE,
        );

        // ---- target frame
        if let Some(t) = p.target {
            let m = &w.mobs[t];
            let (tx, ty, tw, th) = (px + pw + 10.0 * s, py, 250.0 * s, 62.0 * s);
            self.panel(tx, ty, tw, th);
            let lc = level_color(p.level, m.level);
            let name = if m.kind.elite() {
                format!("{} (Elite)", m.kind.name())
            } else {
                m.kind.name().to_string()
            };
            self.text(&name, tx + 10.0 * s, ty + 22.0 * s, 19.0, lc);
            self.text(&format!("Lv {}", m.level), tx + tw - 56.0 * s, ty + 22.0 * s, 17.0, lc);
            self.bar(
                tx + 10.0 * s,
                ty + 30.0 * s,
                tw - 20.0 * s,
                16.0 * s,
                m.hp / m.max_hp,
                Color::new(0.8, 0.15, 0.12, 1.0),
            );
            self.text_c(
                &format!("{} / {}", m.hp.ceil() as i32, m.max_hp as i32),
                tx + tw / 2.0,
                ty + 43.0 * s,
                14.0,
                WHITE,
            );
            if !m.dots.is_empty() {
                self.text(
                    "DoT",
                    tx + 10.0 * s,
                    ty + 58.0 * s,
                    13.0,
                    Color::new(0.8, 0.5, 1.0, 1.0),
                );
            }
        }

        // ---- XP bar
        let xp_h = 8.0 * s;
        if p.level < MAX_LEVEL {
            let need = xp_needed(p.level) as f32;
            self.bar(
                0.0,
                sh - xp_h,
                sw,
                xp_h,
                p.xp as f32 / need,
                Color::new(0.6, 0.3, 0.85, 1.0),
            );
        }

        self.draw_action_bar(w, ui);
        self.draw_log(ui);
        self.draw_minimap(w, cam_yaw);
        self.draw_tracker(w);

        // ---- interaction prompt
        if let Some(msg) = w.nearby_interaction() {
            self.text_c(&msg, sw / 2.0, sh - 178.0 * s, 22.0, Color::new(1.0, 0.95, 0.5, 1.0));
        }

        // ---- level-up banner and toast
        if let Some((b, t)) = &ui.banner {
            let a = (t / 1.0).clamp(0.0, 1.0);
            self.text_c(b, sw / 2.0, sh * 0.28, 64.0, Color::new(1.0, 0.85, 0.2, a));
        }
        if let Some((t, left)) = &ui.toast {
            self.text_c(
                t,
                sw / 2.0,
                sh * 0.2,
                22.0,
                Color::new(1.0, 1.0, 1.0, left.clamp(0.0, 1.0)),
            );
        }

        // ---- dialog
        if let Some((speaker, text)) = &ui.dialog {
            let (dw, dh) = (560.0 * s, 210.0 * s);
            let (dx, dy) = (sw / 2.0 - dw / 2.0, sh * 0.5 - dh / 2.0 - 60.0 * s);
            self.panel(dx, dy, dw, dh);
            self.text(
                speaker,
                dx + 18.0 * s,
                dy + 30.0 * s,
                24.0,
                Color::new(1.0, 0.85, 0.3, 1.0),
            );
            let mut y = dy + 62.0 * s;
            for line in wrap(text, ((dw - 36.0 * s) / (8.0 * s)) as usize) {
                self.text(&line, dx + 18.0 * s, y, 18.0, WHITE);
                y += 22.0 * s;
            }
            self.text("[F] / [Esc] close", dx + dw - 150.0 * s, dy + dh - 12.0 * s, 14.0, GRAY);
        }

        if p.dead {
            draw_rectangle(0.0, 0.0, sw, sh, Color::new(0.4, 0.0, 0.0, 0.35));
            self.text_c(
                "You have fallen",
                sw / 2.0,
                sh * 0.4,
                56.0,
                Color::new(1.0, 0.8, 0.8, 1.0),
            );
            self.text_c(
                "Press R to return to Cinderhold",
                sw / 2.0,
                sh * 0.4 + 44.0 * s,
                26.0,
                WHITE,
            );
        }

        if ui.show_inv {
            self.draw_inventory(w);
        }
        if ui.show_quests {
            self.draw_quest_log(w);
        }
        if ui.show_help {
            self.draw_help();
        }
    }

    /// Geometry of the action bar: (x0, y0, slot size, gap).
    fn bar_geometry(&self) -> (f32, f32, f32, f32) {
        let s = self.s;
        let slot = 64.0 * s;
        let gap = 8.0 * s;
        let total = slot * 5.0 + gap * 4.0;
        (
            screen_width() / 2.0 - total / 2.0,
            screen_height() - slot - 24.0 * s,
            slot,
            gap,
        )
    }

    /// Which action-bar slot (0..4 abilities, 4 = auto-attack) is under the point.
    pub fn action_slot_at(&self, mx: f32, my: f32) -> Option<usize> {
        let (x0, y0, slot, gap) = self.bar_geometry();
        (0..5).find(|&i| {
            let x = x0 + i as f32 * (slot + gap);
            mx >= x && mx <= x + slot && my >= y0 && my <= y0 + slot
        })
    }

    fn draw_action_bar(&self, w: &World, _ui: &UiState) {
        let s = self.s;
        let (sw, _sh) = (screen_width(), screen_height());
        let p = &w.player;
        let now = w.time;
        let (x0, y0, slot, gap) = self.bar_geometry();

        // cast bar
        if let Some(c) = &p.cast {
            let def = &p.class.abilities()[c.ability];
            let frac = ((now - c.start) / (c.end - c.start)) as f32;
            let (bw, bh) = (320.0 * s, 20.0 * s);
            let bx = sw / 2.0 - bw / 2.0;
            let by = y0 - 36.0 * s;
            self.bar(bx, by, bw, bh, frac, Color::new(0.95, 0.75, 0.2, 1.0));
            self.text_c(def.name, sw / 2.0, by + 15.0 * s, 16.0, WHITE);
        }

        let mut hovered: Option<usize> = None;
        for i in 0..5 {
            let x = x0 + i as f32 * (slot + gap);
            let hover = self.inside(x, y0, slot, slot);
            draw_rectangle(x, y0, slot, slot, Color::new(0.08, 0.09, 0.14, 0.92));
            if i < 4 {
                let def = &p.class.abilities()[i];
                let cd_left = w.ability_cooldown_left(i);
                let gcd_left = (p.gcd_end - now).max(0.0) as f32;
                let afford = p.res >= def.cost;
                let tcol = if afford { WHITE } else { Color::new(1.0, 0.4, 0.4, 1.0) };
                let mut words = def.name.splitn(2, ' ');
                let (a, b) = (words.next().unwrap_or(""), words.next());
                self.text_c(a, x + slot / 2.0, y0 + slot * 0.48, 14.0, tcol);
                if let Some(b) = b {
                    self.text_c(b, x + slot / 2.0, y0 + slot * 0.48 + 15.0 * s, 14.0, tcol);
                }
                if def.cost > 0.0 {
                    self.text(
                        &format!("{}", def.cost as i32),
                        x + slot - 22.0 * s,
                        y0 + slot - 6.0 * s,
                        13.0,
                        if afford { rc_color(p.class) } else { RED },
                    );
                }
                if cd_left > 0.05 {
                    let f = (cd_left / def.cooldown.max(0.1)).clamp(0.0, 1.0);
                    draw_rectangle(
                        x,
                        y0 + slot * (1.0 - f),
                        slot,
                        slot * f,
                        Color::new(0.0, 0.0, 0.0, 0.65),
                    );
                    self.text_c(
                        &format!("{:.0}", cd_left.ceil()),
                        x + slot / 2.0,
                        y0 + slot * 0.62,
                        26.0,
                        WHITE,
                    );
                } else if gcd_left > 0.0 {
                    let f = (gcd_left / GCD as f32).clamp(0.0, 1.0);
                    draw_rectangle(x, y0 + slot * (1.0 - f), slot, slot * f, Color::new(0.0, 0.0, 0.0, 0.4));
                }
                self.text(
                    &format!("{}", i + 1),
                    x + 4.0 * s,
                    y0 + 16.0 * s,
                    14.0,
                    Color::new(1.0, 0.9, 0.5, 1.0),
                );
                if hover {
                    hovered = Some(i);
                }
            } else {
                let (r, _, _) = p.class.auto_attack();
                let on = p.auto;
                self.text_c(
                    if r > 5.0 { "Wand" } else { "Attack" },
                    x + slot / 2.0,
                    y0 + slot * 0.5,
                    15.0,
                    WHITE,
                );
                self.text_c(
                    if on { "ON" } else { "off" },
                    x + slot / 2.0,
                    y0 + slot * 0.5 + 16.0 * s,
                    15.0,
                    if on { GREEN } else { GRAY },
                );
                self.text("Q", x + 4.0 * s, y0 + 16.0 * s, 14.0, Color::new(1.0, 0.9, 0.5, 1.0));
            }
            let border = if i == 4 && p.auto {
                Color::new(0.4, 1.0, 0.4, 1.0)
            } else {
                Color::new(0.75, 0.6, 0.3, 1.0)
            };
            draw_rectangle_lines(x, y0, slot, slot, 2.0, border);
        }
        if let Some(i) = hovered {
            let def = &p.class.abilities()[i];
            let (tw, th) = (300.0 * s, 110.0 * s);
            let tx = (mouse_position().0 - tw / 2.0).clamp(4.0, sw - tw - 4.0);
            let ty = y0 - th - 50.0 * s;
            self.panel(tx, ty, tw, th);
            self.text(
                def.name,
                tx + 10.0 * s,
                ty + 24.0 * s,
                20.0,
                Color::new(1.0, 0.85, 0.3, 1.0),
            );
            let cost = if def.cost > 0.0 {
                format!("{} {}", def.cost as i32, p.class.resource().name())
            } else {
                "No cost".into()
            };
            let cast = if def.cast > 0.0 {
                format!("{:.1}s cast", def.cast)
            } else {
                "Instant".into()
            };
            self.text(&format!("{cost}  -  {cast}"), tx + 10.0 * s, ty + 46.0 * s, 15.0, WHITE);
            let cd = if def.cooldown > 0.0 {
                format!("Cooldown {:.0}s", def.cooldown)
            } else {
                String::new()
            };
            let range = if def.range > 0.0 {
                format!("Range {:.0}m  {cd}", def.range)
            } else {
                cd
            };
            self.text(&range, tx + 10.0 * s, ty + 66.0 * s, 15.0, GRAY);
            self.text(
                def.desc,
                tx + 10.0 * s,
                ty + 90.0 * s,
                16.0,
                Color::new(0.85, 0.95, 1.0, 1.0),
            );
        }
    }

    fn draw_log(&self, ui: &UiState) {
        let s = self.s;
        let sh = screen_height();
        let (lw, lh) = (440.0 * s, 150.0 * s);
        let (lx, ly) = (14.0 * s, sh - lh - 26.0 * s);
        draw_rectangle(lx, ly, lw, lh, Color::new(0.0, 0.0, 0.0, 0.35));
        let n = 8;
        let start = ui.log.len().saturating_sub(n);
        for (k, (text, kind)) in ui.log.iter().skip(start).enumerate() {
            let c = match kind {
                LogKind::Combat => Color::new(1.0, 0.85, 0.85, 1.0),
                LogKind::System => Color::new(1.0, 1.0, 0.6, 1.0),
                LogKind::Loot => Color::new(0.6, 0.9, 1.0, 1.0),
                LogKind::Quest => Color::new(1.0, 0.8, 0.3, 1.0),
            };
            let mut t = text.clone();
            while self.width(&t, 15.0) > lw - 14.0 * s && t.len() > 4 {
                t.pop();
            }
            self.text(&t, lx + 7.0 * s, ly + 18.0 * s + k as f32 * 17.5 * s, 15.0, c);
        }
    }

    fn draw_minimap(&self, w: &World, cam_yaw: f32) {
        let s = self.s;
        let sw = screen_width();
        let r = 78.0 * s;
        let (cx, cy) = (sw - r - 16.0 * s, r + 16.0 * s);
        let range = 55.0;
        draw_circle(cx, cy, r + 3.0, Color::new(0.75, 0.6, 0.3, 1.0));
        draw_circle(cx, cy, r, Color::new(0.14, 0.2, 0.12, 0.92));
        let p = &w.player;
        let (sy, cy2) = cam_yaw.sin_cos();
        let to_map = |pos: Vec3| -> Option<Vec2> {
            let d = vec2(pos.x - p.pos.x, pos.z - p.pos.z);
            let fwd = d.x * sy + d.y * cy2;
            let right = d.x * -cy2 + d.y * sy;
            let v = vec2(right, -fwd) / range * r;
            if v.length() > r - 3.0 {
                return None;
            }
            Some(vec2(cx, cy) + v)
        };
        // village marker
        if let Some(v) = to_map(vec3(0.0, 0.0, 0.0)) {
            draw_circle(v.x, v.y, 18.0 / range * r, Color::new(0.55, 0.47, 0.34, 0.7));
        }
        for m in &w.mobs {
            if m.state == MobState::Dead {
                continue;
            }
            if let Some(v) = to_map(m.pos) {
                let c = if m.kind.elite() {
                    Color::new(1.0, 0.4, 1.0, 1.0)
                } else {
                    Color::new(0.95, 0.2, 0.2, 1.0)
                };
                draw_circle(v.x, v.y, 2.6 * s, c);
            }
        }
        for n in &w.npcs {
            if let Some(v) = to_map(n.pos) {
                draw_circle(v.x, v.y, 3.2 * s, Color::new(1.0, 0.9, 0.2, 1.0));
            }
        }
        // player arrow: facing relative to camera
        let rel = p.yaw - cam_yaw;
        let tip = vec2(cx - rel.sin() * 8.0 * s, cy - rel.cos() * 8.0 * s);
        let l = vec2(cx - (rel + 2.5).sin() * 5.0 * s, cy - (rel + 2.5).cos() * 5.0 * s);
        let rr = vec2(cx - (rel - 2.5).sin() * 5.0 * s, cy - (rel - 2.5).cos() * 5.0 * s);
        draw_triangle(tip, l, rr, WHITE);
        self.text_c(
            "Cinderhold Vale",
            cx,
            cy + r + 20.0 * s,
            15.0,
            Color::new(1.0, 0.9, 0.6, 1.0),
        );
    }

    fn draw_tracker(&self, w: &World) {
        let s = self.s;
        let sw = screen_width();
        let x = sw - 270.0 * s;
        let mut y = 215.0 * s;
        for qp in &w.player.quests {
            let Some(def) = quest(qp.id) else { continue };
            self.text(def.name, x, y, 17.0, Color::new(1.0, 0.85, 0.3, 1.0));
            y += 19.0 * s;
            let done = qp.count >= def.count;
            let line = if done {
                "Ready to turn in".to_string()
            } else {
                format!("{}: {}/{}", def.objective, qp.count, def.count)
            };
            self.text(&line, x + 8.0 * s, y, 15.0, if done { GREEN } else { WHITE });
            y += 26.0 * s;
        }
        if w.player.quests.is_empty() && w.player.done_quests.len() < QUESTS.len() {
            self.text(
                "Find Warden Maren in Cinderhold",
                x,
                y,
                15.0,
                Color::new(1.0, 0.85, 0.3, 1.0),
            );
        }
    }

    fn draw_inventory(&self, w: &World) {
        let s = self.s;
        let p = &w.player;
        let (pw, ph) = (440.0 * s, 560.0 * s);
        let (x, y) = (60.0 * s, 110.0 * s);
        self.panel(x, y, pw, ph);
        self.text(
            "Character  [I]",
            x + 16.0 * s,
            y + 30.0 * s,
            24.0,
            Color::new(1.0, 0.85, 0.3, 1.0),
        );
        self.text(
            &format!("{}  Level {}", p.class.name(), p.level),
            x + 16.0 * s,
            y + 58.0 * s,
            19.0,
            col(p.class.color()),
        );
        self.text(
            &format!(
                "Health {}   Power {:.0}   Armor {:.0}",
                p.max_hp() as i32,
                p.power(),
                p.armor()
            ),
            x + 16.0 * s,
            y + 82.0 * s,
            16.0,
            WHITE,
        );
        if p.level < MAX_LEVEL {
            self.text(
                &format!("XP {}/{}", p.xp, xp_needed(p.level)),
                x + 16.0 * s,
                y + 102.0 * s,
                16.0,
                Color::new(0.75, 0.5, 1.0, 1.0),
            );
        } else {
            self.text(
                "Max level reached",
                x + 16.0 * s,
                y + 102.0 * s,
                16.0,
                Color::new(0.75, 0.5, 1.0, 1.0),
            );
        }
        self.text(
            &format!("Gold: {}", format_copper(p.copper)),
            x + 250.0 * s,
            y + 102.0 * s,
            16.0,
            Color::new(1.0, 0.85, 0.3, 1.0),
        );
        let mut yy = y + 136.0 * s;
        self.text("Equipment", x + 16.0 * s, yy, 18.0, GRAY);
        yy += 24.0 * s;
        for slot in Slot::ALL {
            let label = slot.name();
            match &p.equipment[slot.index()] {
                Some(it) => {
                    self.text(&format!("{label}:"), x + 16.0 * s, yy, 16.0, GRAY);
                    self.text(
                        &format!("{}  (+{:.0} pow, +{:.0} arm)", it.name, it.power, it.armor),
                        x + 90.0 * s,
                        yy,
                        16.0,
                        col(it.rarity.color()),
                    );
                }
                None => {
                    self.text(&format!("{label}:"), x + 16.0 * s, yy, 16.0, GRAY);
                    self.text("(empty)", x + 90.0 * s, yy, 16.0, DARKGRAY);
                }
            }
            yy += 22.0 * s;
        }
        yy += 14.0 * s;
        self.text(
            &format!("Bag ({}/{})", p.inventory.len(), INVENTORY_SIZE),
            x + 16.0 * s,
            yy,
            18.0,
            GRAY,
        );
        yy += 24.0 * s;
        if p.inventory.is_empty() {
            self.text(
                "Empty. Loot corpses with [F]; sell junk to Tolly Brass.",
                x + 16.0 * s,
                yy,
                15.0,
                DARKGRAY,
            );
        }
        for it in p.inventory.iter().take(14) {
            self.text(&it.name, x + 16.0 * s, yy, 16.0, col(it.rarity.color()));
            self.text(&format_copper(it.value), x + pw - 90.0 * s, yy, 15.0, GRAY);
            yy += 20.0 * s;
        }
    }

    fn draw_quest_log(&self, w: &World) {
        let s = self.s;
        let (pw, ph) = (520.0 * s, 520.0 * s);
        let (x, y) = (screen_width() / 2.0 - pw / 2.0 + 80.0 * s, 110.0 * s);
        self.panel(x, y, pw, ph);
        self.text(
            "Quest Log  [L]",
            x + 16.0 * s,
            y + 30.0 * s,
            24.0,
            Color::new(1.0, 0.85, 0.3, 1.0),
        );
        let mut yy = y + 64.0 * s;
        for q in QUESTS.iter() {
            let (state, c) = match w.quest_state(q) {
                QuestState::Done => ("Completed", GRAY),
                QuestState::ReadyToTurnIn => ("Ready to turn in", GREEN),
                QuestState::Active => ("In progress", WHITE),
                QuestState::Available => ("Available - talk to Warden Maren", Color::new(1.0, 0.85, 0.3, 1.0)),
                QuestState::Locked => ("Locked", DARKGRAY),
            };
            self.text(q.name, x + 16.0 * s, yy, 19.0, c);
            self.text(state, x + pw - 230.0 * s, yy, 15.0, c);
            yy += 20.0 * s;
            if let Some(pq) = w.player.quest_progress(q.id) {
                self.text(
                    &format!("{}: {}/{}", q.objective, pq.count, q.count),
                    x + 28.0 * s,
                    yy,
                    15.0,
                    WHITE,
                );
                yy += 18.0 * s;
            }
            yy += 14.0 * s;
        }
    }

    fn draw_help(&self) {
        let s = self.s;
        let (sw, sh) = (screen_width(), screen_height());
        let (pw, ph) = (560.0 * s, 440.0 * s);
        let (x, y) = (sw / 2.0 - pw / 2.0, sh / 2.0 - ph / 2.0 - 30.0 * s);
        self.panel(x, y, pw, ph);
        self.text_c(
            "Welcome to Emberfall",
            x + pw / 2.0,
            y + 38.0 * s,
            30.0,
            Color::new(1.0, 0.85, 0.3, 1.0),
        );
        let lines = [
            "W A S D ........ move        Space ........ jump",
            "Hold right mouse / arrow keys ... turn camera",
            "Mouse wheel .... zoom camera",
            "Tab / left click ... select enemy     Esc ... clear",
            "1-4 ........ abilities       Q ........ auto-attack",
            "F ........ talk / loot      I ... bags   L ... quests",
            "R ........ return to Cinderhold after death",
            "F5 ....... save              H ....... this help",
            "",
            "Find Warden Maren in the village for your first quest.",
            "Beasts roam the vale - watch their level colour!",
        ];
        let mut yy = y + 80.0 * s;
        for l in lines {
            self.text(l, x + 30.0 * s, yy, 18.0, WHITE);
            yy += 28.0 * s;
        }
        self.text_c("Press H to close", x + pw / 2.0, y + ph - 18.0 * s, 17.0, GRAY);
    }
}

fn rc_color(c: Class) -> Color {
    match c.resource() {
        Resource::Rage => Color::new(1.0, 0.45, 0.35, 1.0),
        Resource::Mana => Color::new(0.5, 0.7, 1.0, 1.0),
    }
}

fn wrap(text: &str, width: usize) -> Vec<String> {
    let mut out = Vec::new();
    for para in text.split('\n') {
        let mut line = String::new();
        for word in para.split_whitespace() {
            if !line.is_empty() && line.len() + 1 + word.len() > width {
                out.push(std::mem::take(&mut line));
            }
            if !line.is_empty() {
                line.push(' ');
            }
            line.push_str(word);
        }
        out.push(line);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wrap_breaks_on_words_and_keeps_paragraphs() {
        let lines = wrap("one two three four\n\nfive", 9);
        assert_eq!(lines, vec!["one two", "three", "four", "", "five"]);
    }
}
