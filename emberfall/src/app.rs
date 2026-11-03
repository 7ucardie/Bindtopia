//! Window, input handling, camera and the main loop.

use crate::data::*;
use crate::gfx::{rgb, Batch};
use crate::render::{self, Scenery};
use crate::save;
use crate::sim::*;
use crate::ui::{project, Gui, UiState};
use macroquad::prelude::*;

const SKY: Color = Color::new(0.56, 0.74, 0.92, 1.0);

struct Cam {
    yaw: f32,
    pitch: f32,
    dist: f32,
}

enum Screen {
    Menu,
    Playing,
}

struct App {
    screen: Screen,
    menu_sel: usize,
    saved: Option<SaveData>,
    world: World,
    scenery: Scenery,
    cam: Cam,
    ui: UiState,
    batch: Batch,
    looking: bool,
    last_mouse: Vec2,
    autosave: f32,
    time: f32,
}

fn seed() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos() as u64)
        .unwrap_or(42)
}

fn make_camera(pos: Vec3, target: Vec3) -> Camera3D {
    Camera3D {
        position: pos,
        target,
        up: vec3(0.0, 1.0, 0.0),
        fovy: 55f32.to_radians(),
        z_near: render::Z_NEAR,
        z_far: render::Z_FAR,
        ..Default::default()
    }
}

impl App {
    fn new() -> App {
        let saved = save::load();
        let menu_sel = saved
            .as_ref()
            .and_then(|s| Class::ALL.iter().position(|&c| c == s.class))
            .unwrap_or(0);
        App {
            screen: Screen::Menu,
            menu_sel,
            saved,
            world: World::new(Class::Warrior, 1),
            scenery: render::build_scenery(),
            cam: Cam {
                yaw: 0.0,
                pitch: 0.38,
                dist: 9.0,
            },
            ui: UiState::new(),
            batch: Batch::new(),
            looking: false,
            last_mouse: Vec2::ZERO,
            autosave: 0.0,
            time: 0.0,
        }
    }

    fn start(&mut self, world: World) {
        self.world = world;
        self.cam.yaw = self.world.player.yaw + std::f32::consts::PI;
        self.cam.yaw = std::f32::consts::PI;
        self.ui = UiState::new();
        self.ui.show_help = self.saved.is_none();
        self.screen = Screen::Playing;
        self.autosave = 0.0;
        self.world
            .push_log("Welcome to Emberfall. Press H for help.", LogKind::System);
    }

    fn save(&mut self) -> bool {
        if !matches!(self.screen, Screen::Playing) {
            return false;
        }
        let data = self.world.to_save();
        let ok = save::store(&data).is_ok();
        self.saved = Some(data);
        ok
    }

    fn set_look(&mut self, on: bool) {
        if on != self.looking {
            self.looking = on;
            set_cursor_grab(on);
            show_mouse(!on);
        }
    }

    // ------------------------------------------------------------- menu

    fn menu_frame(&mut self, dt: f32) {
        self.set_look(false);
        self.time += dt;
        let gui = Gui::new();
        let s = gui.s;
        let (sw, sh) = (screen_width(), screen_height());

        // background: slow orbit around Cinderhold
        let a = self.time * 0.12;
        let cam = make_camera(vec3(a.sin() * 34.0, 12.0, a.cos() * 34.0), vec3(0.0, 2.0, 0.0));
        clear_background(SKY);
        set_camera(&cam);
        self.scenery.draw();
        for n in &self.world.npcs {
            render::draw_npc(&mut self.batch, n, self.time);
        }
        render::draw_fire(&mut self.batch, vec3(0.0, 0.1, 0.0), self.time);
        self.batch.draw_and_clear();
        set_default_camera();

        draw_rectangle(0.0, 0.0, sw, sh, Color::new(0.0, 0.0, 0.05, 0.45));
        gui.text_c("EMBERFALL", sw / 2.0, sh * 0.17, 92.0, Color::new(1.0, 0.8, 0.3, 1.0));
        gui.text_c(
            "A fantasy adventure in Rust",
            sw / 2.0,
            sh * 0.17 + 36.0 * s,
            26.0,
            Color::new(0.9, 0.9, 1.0, 1.0),
        );

        // class cards
        let (cw, ch, gap) = (250.0 * s, 330.0 * s, 24.0 * s);
        let x0 = sw / 2.0 - (cw * 3.0 + gap * 2.0) / 2.0;
        let y0 = sh * 0.3;
        let (mx, my) = mouse_position();
        for (i, class) in Class::ALL.iter().enumerate() {
            let x = x0 + i as f32 * (cw + gap);
            if is_mouse_button_pressed(MouseButton::Left) && gui.inside(x, y0, cw, ch) {
                if self.menu_sel == i {
                    self.new_game();
                    return;
                }
                self.menu_sel = i;
            }
            let sel = i == self.menu_sel;
            gui.panel(x, y0, cw, ch);
            if sel {
                draw_rectangle_lines(
                    x - 3.0,
                    y0 - 3.0,
                    cw + 6.0,
                    ch + 6.0,
                    4.0,
                    Color::new(1.0, 0.85, 0.3, 1.0),
                );
            }
            let c = class.color();
            gui.text_c(
                class.name(),
                x + cw / 2.0,
                y0 + 40.0 * s,
                28.0,
                Color::from_rgba(c[0], c[1], c[2], 255),
            );
            let mut y = y0 + 70.0 * s;
            for line in wrap_text(class.blurb(), 30) {
                gui.text_c(&line, x + cw / 2.0, y, 16.0, WHITE);
                y += 20.0 * s;
            }
            y += 12.0 * s;
            for ab in class.abilities() {
                gui.text(ab.name, x + 20.0 * s, y, 16.0, Color::new(0.85, 0.95, 1.0, 1.0));
                y += 22.0 * s;
            }
            let _ = (mx, my);
        }
        gui.text_c(
            "Left / Right to choose  -  Enter to begin a new hero",
            sw / 2.0,
            y0 + ch + 44.0 * s,
            22.0,
            WHITE,
        );
        if let Some(sv) = &self.saved {
            gui.text_c(
                &format!("[C] Continue: {} - level {}", sv.class.name(), sv.level),
                sw / 2.0,
                y0 + ch + 78.0 * s,
                24.0,
                Color::new(0.6, 1.0, 0.6, 1.0),
            );
        }

        if is_key_pressed(KeyCode::Left) || is_key_pressed(KeyCode::A) {
            self.menu_sel = (self.menu_sel + 2) % 3;
        }
        if is_key_pressed(KeyCode::Right) || is_key_pressed(KeyCode::D) {
            self.menu_sel = (self.menu_sel + 1) % 3;
        }
        if is_key_pressed(KeyCode::Enter) || is_key_pressed(KeyCode::Space) {
            self.new_game();
        } else if is_key_pressed(KeyCode::C) {
            if let Some(sv) = self.saved.clone() {
                self.start(World::from_save(sv, seed()));
            }
        }
    }

    fn new_game(&mut self) {
        let class = Class::ALL[self.menu_sel];
        self.saved = None;
        self.start(World::new(class, seed()));
    }

    // ------------------------------------------------------------- play

    fn gather_intent(&mut self, gui: &Gui, dt: f32, matrix: Mat4) -> Intent {
        let mut it = Intent::default();
        let (sw, sh) = (screen_width(), screen_height());

        // camera control
        let mouse = Vec2::from(mouse_position());
        let rmb = is_mouse_button_down(MouseButton::Right);
        self.set_look(rmb && !self.world.player.dead);
        if rmb {
            let d = mouse - self.last_mouse;
            self.cam.yaw -= d.x * 0.0045;
            self.cam.pitch = (self.cam.pitch + d.y * 0.004).clamp(0.05, 1.4);
        }
        self.last_mouse = mouse;
        if is_key_down(KeyCode::Left) {
            self.cam.yaw += 1.9 * dt;
        }
        if is_key_down(KeyCode::Right) {
            self.cam.yaw -= 1.9 * dt;
        }
        if is_key_down(KeyCode::Up) {
            self.cam.pitch = (self.cam.pitch - 1.0 * dt).max(0.05);
        }
        if is_key_down(KeyCode::Down) {
            self.cam.pitch = (self.cam.pitch + 1.0 * dt).min(1.4);
        }
        let wheel = mouse_wheel().1;
        if wheel != 0.0 {
            self.cam.dist = (self.cam.dist - wheel.signum() * 0.9).clamp(3.0, 20.0);
        }

        // movement relative to the camera
        let (sy, cy) = self.cam.yaw.sin_cos();
        let fwd = vec2(sy, cy);
        let right = vec2(-cy, sy);
        let mut d = Vec2::ZERO;
        if is_key_down(KeyCode::W) {
            d += fwd;
        }
        if is_key_down(KeyCode::S) {
            d -= fwd;
        }
        if is_key_down(KeyCode::D) {
            d += right;
        }
        if is_key_down(KeyCode::A) {
            d -= right;
        }
        it.move_dir = d;
        it.jump = is_key_pressed(KeyCode::Space);
        if rmb {
            it.face_yaw = Some(self.cam.yaw);
        }

        // abilities
        for (i, k) in [KeyCode::Key1, KeyCode::Key2, KeyCode::Key3, KeyCode::Key4]
            .iter()
            .enumerate()
        {
            if is_key_pressed(*k) {
                it.ability = Some(i);
            }
        }
        if is_key_pressed(KeyCode::Q) {
            it.toggle_auto = true;
        }
        if is_key_pressed(KeyCode::Tab) {
            it.cycle_target = true;
        }
        if is_key_pressed(KeyCode::R) {
            it.respawn = true;
        }

        // mouse clicks: action bar first, then picking
        if is_mouse_button_pressed(MouseButton::Left) {
            if let Some(slot) = gui.action_slot_at(mouse.x, mouse.y) {
                if slot < 4 {
                    it.ability = Some(slot);
                } else {
                    it.toggle_auto = true;
                }
            } else if mouse.y < sh - 100.0 * gui.s && mouse.x < sw {
                let mut best: Option<(usize, f32)> = None;
                for (i, m) in self.world.mobs.iter().enumerate() {
                    if m.state == MobState::Dead {
                        continue;
                    }
                    let c = m.pos + vec3(0.0, 1.0 * m.kind.scale(), 0.0);
                    if let Some(sp) = project(matrix, c) {
                        let dist = sp.distance(mouse);
                        if dist < 45.0 * gui.s * m.kind.scale().max(0.9) && best.is_none_or(|(_, b)| dist < b) {
                            best = Some((i, dist));
                        }
                    }
                }
                if let Some((i, _)) = best {
                    it.set_target = Some(Some(i));
                }
            }
        }

        // UI toggles
        if (is_key_pressed(KeyCode::F) || is_key_pressed(KeyCode::E)) && self.ui.dialog.take().is_none() {
            it.interact = true;
        }
        if is_key_pressed(KeyCode::I) {
            self.ui.show_inv = !self.ui.show_inv;
        }
        if is_key_pressed(KeyCode::L) {
            self.ui.show_quests = !self.ui.show_quests;
        }
        if is_key_pressed(KeyCode::H) {
            self.ui.show_help = !self.ui.show_help;
        }
        if is_key_pressed(KeyCode::Escape) {
            if self.ui.dialog.take().is_some() {
            } else if self.ui.show_help || self.ui.show_inv || self.ui.show_quests {
                self.ui.show_help = false;
                self.ui.show_inv = false;
                self.ui.show_quests = false;
            } else {
                it.set_target = Some(None);
            }
        }
        if is_key_pressed(KeyCode::F5) {
            let ok = self.save();
            self.ui.toast = Some((
                if ok {
                    "Game saved".into()
                } else {
                    "Could not save the game".into()
                },
                2.0,
            ));
        }
        it
    }

    fn camera(&self) -> Camera3D {
        let p = &self.world.player;
        let target = p.pos + vec3(0.0, 1.7, 0.0);
        let c = &self.cam;
        let off = vec3(
            -c.yaw.sin() * c.pitch.cos(),
            c.pitch.sin(),
            -c.yaw.cos() * c.pitch.cos(),
        ) * c.dist;
        let mut pos = target + off;
        let ground = crate::terrain::height(pos.x, pos.z) + 0.9;
        if pos.y < ground {
            pos.y = ground;
        }
        make_camera(pos, target)
    }

    fn play_frame(&mut self, dt: f32) {
        let gui = Gui::new();
        self.time += dt;
        let cam = self.camera();
        let matrix = cam.matrix();
        let intent = self.gather_intent(&gui, dt, matrix);
        let level_before = self.world.player.level;
        let quests_before = (self.world.player.done_quests.len(), self.world.player.quests.len());
        self.world.update(dt, &intent);
        let events = std::mem::take(&mut self.world.events);
        self.ui.absorb(events);
        self.ui.tick(dt);

        // autosave on milestones and every 45 s
        self.autosave += dt;
        let milestone = self.world.player.level != level_before
            || quests_before != (self.world.player.done_quests.len(), self.world.player.quests.len());
        if milestone || self.autosave > 45.0 {
            self.autosave = 0.0;
            self.save();
        }

        // ---- 3D pass (camera recomputed after movement)
        let cam = self.camera();
        let matrix = cam.matrix();
        clear_background(SKY);
        set_camera(&cam);
        self.scenery.draw();
        let t = self.world.time as f32;
        let w = &self.world;
        render::draw_player(&mut self.batch, &w.player, t);
        for n in &w.npcs {
            render::draw_npc(&mut self.batch, n, t);
        }
        for (i, m) in w.mobs.iter().enumerate() {
            if (m.pos - w.player.pos).length() < 150.0 {
                render::draw_mob(&mut self.batch, m, t, i);
            }
        }
        render::draw_fire(&mut self.batch, vec3(0.0, 0.1, 0.0), t);
        render::draw_fire(
            &mut self.batch,
            vec3(-58.0, crate::terrain::height(-58.0, -58.0), -58.0),
            t + 1.0,
        );
        self.batch.draw_and_clear();

        if let Some(ti) = w.player.target {
            let m = &w.mobs[ti];
            let hostile = Color::new(1.0, 0.25, 0.2, 1.0);
            render::draw_ring(m.pos, 1.2 * m.kind.scale().max(0.9), hostile);
            render::draw_ring(m.pos, 1.1 * m.kind.scale().max(0.9), hostile);
        }
        for (from, to, c, age) in &self.ui.bolts {
            let f = (age / 0.2).min(1.0);
            let head = *from + (*to - *from) * f;
            let tail = *from + (*to - *from) * (f - 0.25).max(0.0);
            draw_line_3d(tail, head, *c);
            draw_line_3d(tail + vec3(0.0, 0.05, 0.0), head + vec3(0.0, 0.05, 0.0), *c);
        }
        for (pos, radius, c, age) in &self.ui.rings {
            let f = (age / 0.4).min(1.0);
            render::draw_ring(*pos, radius * (0.2 + 0.8 * f), *c);
        }
        set_default_camera();

        // ---- 2D pass
        gui.draw_world_labels(&self.world, &self.ui, matrix);
        gui.draw_hud(&self.world, &self.ui, self.cam.yaw);
        let _ = rgb;
    }
}

fn wrap_text(text: &str, width: usize) -> Vec<String> {
    let mut out = Vec::new();
    let mut line = String::new();
    for word in text.split_whitespace() {
        if !line.is_empty() && line.len() + 1 + word.len() > width {
            out.push(std::mem::take(&mut line));
        }
        if !line.is_empty() {
            line.push(' ');
        }
        line.push_str(word);
    }
    if !line.is_empty() {
        out.push(line);
    }
    out
}

/// Developer aid: `EMBERFALL_SHOTS=<dir>` plays a short scripted session headlessly and
/// writes screenshots (menu, village, combat) to that directory, then exits.
fn shot_script(app: &mut App, frame: u32) -> (bool, Option<&'static str>) {
    let mut shot = None;
    let mut save = |name: &'static str| shot = Some(name);
    match frame {
        8 => save("1-menu"),
        10 => {
            app.menu_sel = std::env::var("EMBERFALL_CLASS")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(1);
            app.new_game();
            app.ui.show_help = false;
        }
        40 => {
            app.ui.show_help = true;
        }
        45 => save("2-help"),
        46 => app.ui.show_help = false,
        60 => {
            app.world.player.pos = vec3(-3.0, 0.0, 0.5);
            app.world.interact();
        }
        90 => save("3-village-dialog"),
        100 => {
            app.ui.dialog = None;
            let i = (0..app.world.mobs.len())
                .find(|&i| app.world.mobs[i].kind == MobKind::Boar)
                .unwrap();
            let m = app.world.mobs[i].pos;
            app.world.player.pos = vec3(m.x, m.y, m.z - 9.0);
            app.world.player.target = Some(i);
            app.cam.yaw = 0.0;
        }
        110 => {
            app.world.player.pos.y = crate::terrain::height(app.world.player.pos.x, app.world.player.pos.z);
        }
        120 => {
            app.world.player.yaw = 0.0;
        }
        150 => save("4-combat"),
        _ => {}
    }
    (frame > 160, shot)
}

pub async fn run() {
    prevent_quit();
    let mut app = App::new();
    let shots = std::env::var("EMBERFALL_SHOTS").ok();
    let mut frame = 0u32;
    loop {
        let mut shot = None;
        if shots.is_some() {
            frame += 1;
            let (done, s) = shot_script(&mut app, frame);
            if done {
                break;
            }
            shot = s;
        }
        if is_quit_requested() {
            app.save();
            break;
        }
        let dt = get_frame_time().min(0.05);
        match app.screen {
            Screen::Menu => app.menu_frame(dt),
            Screen::Playing => app.play_frame(dt),
        }
        if let (Some(dir), Some(name)) = (&shots, shot) {
            let _ = std::fs::create_dir_all(dir);
            get_screen_data().export_png(&format!("{dir}/{name}.png"));
        }
        next_frame().await;
    }
}
