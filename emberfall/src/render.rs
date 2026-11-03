//! 3D rendering of the world: baked static scenery plus per-frame characters.
#![allow(clippy::too_many_arguments)]

use crate::data::*;
use crate::gfx::{rgb, rotate_y, Batch};
use crate::rng::Rng;
use crate::sim::*;
use crate::terrain::{self, HALF};
use macroquad::prelude::*;

pub const Z_NEAR: f32 = 0.3;
pub const Z_FAR: f32 = 420.0;

pub struct Scenery {
    meshes: Vec<Mesh>,
}

fn at(x: f32, z: f32) -> Vec3 {
    vec3(x, terrain::height(x, z), z)
}

fn terrain_normal(x: f32, z: f32) -> Vec3 {
    let e = 0.6;
    let dx = terrain::height(x + e, z) - terrain::height(x - e, z);
    let dz = terrain::height(x, z + e) - terrain::height(x, z - e);
    vec3(-dx, 2.0 * e, -dz).normalize()
}

fn build_terrain(b: &mut Batch) {
    let cell = 2.5;
    let n = (2.0 * HALF / cell) as i32;
    let vert = |i: i32, j: i32| {
        let x = -HALF + i as f32 * cell;
        let z = -HALF + j as f32 * cell;
        let h = terrain::height(x, z);
        let nrm = terrain_normal(x, z);
        let k = 0.55 + 0.6 * nrm.dot(vec3(0.45, 0.8, 0.35).normalize()).max(0.0);
        let [r, g, bl] = terrain::ground_color(x, z, h);
        (
            vec3(x, h, z),
            Color::new((r * k).min(1.0), (g * k).min(1.0), (bl * k).min(1.0), 1.0),
        )
    };
    for j in 0..n {
        for i in 0..n {
            let (a, bb, c, d) = (vert(i, j), vert(i + 1, j), vert(i + 1, j + 1), vert(i, j + 1));
            b.tri_smooth([a, d, c]);
            b.tri_smooth([a, c, bb]);
        }
    }
}

fn tree(b: &mut Batch, rng: &mut Rng, p: Vec3) {
    let s = rng.range(0.8, 1.5);
    let yaw = rng.range(0.0, std::f32::consts::TAU);
    b.cuboid(
        p + vec3(0.0, 1.0 * s, 0.0),
        vec3(0.28 * s, 1.0 * s, 0.28 * s),
        yaw,
        rgb(96, 66, 40),
    );
    let g = rng.range(0.0, 25.0) as u8;
    b.cone(
        p + vec3(0.0, 1.6 * s, 0.0),
        1.9 * s,
        2.6 * s,
        7,
        yaw,
        rgb(36 + g, 98 + g, 48),
    );
    b.cone(
        p + vec3(0.0, 3.0 * s, 0.0),
        1.4 * s,
        2.2 * s,
        7,
        yaw,
        rgb(44 + g, 112 + g, 54),
    );
}

fn rock(b: &mut Batch, rng: &mut Rng, p: Vec3) {
    let s = rng.range(0.6, 1.8);
    let yaw = rng.range(0.0, std::f32::consts::TAU);
    let v = rng.range(0.0, 30.0) as u8;
    b.cuboid(
        p + vec3(0.0, 0.4 * s, 0.0),
        vec3(0.9 * s, 0.5 * s, 0.7 * s),
        yaw,
        rgb(112 + v, 112 + v, 118 + v),
    );
    b.cuboid(
        p + vec3(0.2 * s, 0.9 * s, 0.1 * s),
        vec3(0.5 * s, 0.35 * s, 0.45 * s),
        yaw + 0.6,
        rgb(124 + v, 124 + v, 130 + v),
    );
}

fn house(b: &mut Batch, x: f32, z: f32, w: f32, d: f32, h: f32, yaw: f32, roof: Color) {
    let base = at(x, z);
    let y0 = terrain::height(x, z);
    b.cuboid(
        vec3(x, y0 + h * 0.5 - 0.3, z),
        vec3(w * 0.5, h * 0.5 + 0.3, d * 0.5),
        yaw,
        rgb(206, 182, 140),
    );
    // roof: pyramid sized to the footprint
    let r = (w * w + d * d).sqrt() * 0.5 + 0.5;
    b.cone(
        vec3(x, y0 + h, z),
        r,
        h * 0.7,
        4,
        yaw + std::f32::consts::FRAC_PI_4 + (d / w).atan() - std::f32::consts::FRAC_PI_4,
        roof,
    );
    // door
    let door = base + rotate_y(vec3(0.0, 0.9, d * 0.5 + 0.02), yaw);
    b.cuboid(door, vec3(0.45, 0.9, 0.06), yaw, rgb(86, 56, 34));
}

fn tent(b: &mut Batch, x: f32, z: f32, yaw: f32, col: Color) {
    let y0 = terrain::height(x, z);
    b.cone(vec3(x, y0, z), 2.3, 2.6, 4, yaw, col);
}

pub fn build_scenery() -> Scenery {
    let mut b = Batch::new();
    build_terrain(&mut b);
    let mut rng = Rng::new(0xE4BE_5EED);

    // trees and rocks, scattered but kept clear of the village, camp and den
    let camp = (-58.0, -58.0);
    let den = (66.0, -62.0);
    let mut placed = 0;
    let mut tries = 0;
    while placed < 330 && tries < 5000 {
        tries += 1;
        let x = rng.range(-HALF + 4.0, HALF - 4.0);
        let z = rng.range(-HALF + 4.0, HALF - 4.0);
        let d = (x * x + z * z).sqrt();
        if d < 24.0 || (x - camp.0).hypot(z - camp.1) < 12.0 || (x - den.0).hypot(z - den.1) < 7.0 {
            continue;
        }
        // denser forest in the east (wolves), sparse on the southern meadow
        let density = if x > 30.0 {
            1.0
        } else if z > 25.0 {
            0.25
        } else {
            0.55
        };
        if !rng.chance(density) {
            continue;
        }
        if rng.chance(0.82) {
            tree(&mut b, &mut rng, at(x, z));
        } else {
            rock(&mut b, &mut rng, at(x, z));
        }
        placed += 1;
    }

    // Cinderhold
    house(&mut b, -13.0, -8.0, 6.0, 5.0, 3.6, 0.3, rgb(150, 70, 52));
    house(&mut b, 12.0, 9.0, 5.5, 5.0, 3.4, -0.5, rgb(130, 82, 52));
    house(&mut b, 11.0, -11.0, 6.5, 5.0, 3.8, 2.6, rgb(150, 70, 52));
    house(&mut b, -11.0, 11.5, 5.0, 4.5, 3.2, 3.6, rgb(120, 78, 56));
    house(&mut b, 0.0, -15.0, 8.0, 5.5, 4.2, 0.0, rgb(110, 62, 50));
    // well
    let wy = terrain::height(0.0, -6.5);
    b.cuboid(vec3(0.0, wy + 0.5, -6.5), vec3(1.1, 0.5, 1.1), 0.0, rgb(130, 130, 136));
    b.cuboid(vec3(0.0, wy + 0.52, -6.5), vec3(0.8, 0.5, 0.8), 0.0, rgb(30, 50, 70));
    b.cuboid(vec3(-1.0, wy + 1.4, -6.5), vec3(0.1, 0.9, 0.1), 0.0, rgb(96, 66, 40));
    b.cuboid(vec3(1.0, wy + 1.4, -6.5), vec3(0.1, 0.9, 0.1), 0.0, rgb(96, 66, 40));
    b.cone(vec3(0.0, wy + 2.3, -6.5), 1.7, 0.9, 4, 0.78, rgb(120, 60, 48));
    // fence posts around the village edge (gap at the south road)
    for i in 0..44 {
        let a = i as f32 / 44.0 * std::f32::consts::TAU;
        if a.cos() > 0.0 && (a.sin()).abs() < 0.0 {
            continue;
        }
        let (x, z) = (a.sin() * 20.0, a.cos() * 20.0);
        if z > 14.0 && x.abs() < 5.0 {
            continue;
        }
        b.cuboid(
            at(x, z) + vec3(0.0, 0.6, 0.0),
            vec3(0.12, 0.6, 0.12),
            a,
            rgb(110, 80, 52),
        );
    }

    // bandit camp
    for (k, &(dx, dz)) in [(-4.0, -3.0), (4.5, -2.0), (-1.0, 5.0), (5.0, 4.5)].iter().enumerate() {
        tent(
            &mut b,
            camp.0 + dx,
            camp.1 + dz,
            k as f32 * 0.7,
            if k % 2 == 0 { rgb(140, 50, 44) } else { rgb(120, 96, 60) },
        );
    }
    b.cuboid(
        at(camp.0, camp.1) + vec3(0.0, 0.2, 0.0),
        vec3(0.9, 0.2, 0.2),
        0.4,
        rgb(70, 46, 30),
    );
    b.cuboid(
        at(camp.0, camp.1) + vec3(0.0, 0.2, 0.0),
        vec3(0.9, 0.2, 0.2),
        -0.6,
        rgb(70, 46, 30),
    );

    // Gnarlfang's den: a ring of tall rocks
    for i in 0..9 {
        let a = i as f32 / 9.0 * std::f32::consts::TAU;
        let p = at(den.0 + a.sin() * 7.0, den.1 + a.cos() * 7.0);
        let s = rng.range(1.8, 3.2);
        b.cuboid(p + vec3(0.0, s, 0.0), vec3(0.9, s, 0.8), a, rgb(92, 90, 98));
    }

    Scenery {
        meshes: b.into_meshes(),
    }
}

impl Scenery {
    pub fn draw(&self) {
        for m in &self.meshes {
            draw_mesh(m);
        }
    }
}

// ------------------------------------------------------------- characters

fn part(b: &mut Batch, base: Vec3, yaw: f32, off: Vec3, half: Vec3, col: Color) {
    b.cuboid(base + rotate_y(off, yaw), half, yaw, col);
}

fn ball(b: &mut Batch, base: Vec3, yaw: f32, off: Vec3, r: f32, col: Color) {
    b.sphere(base + rotate_y(off, yaw), r, col);
}

struct Look {
    body: Color,
    legs: Color,
    skin: Color,
}

fn humanoid(
    b: &mut Batch,
    pos: Vec3,
    yaw: f32,
    scale: f32,
    look: &Look,
    walk: f32,
    swing: f32,
    extra: impl FnOnce(&mut Batch, Vec3, f32, f32, f32),
) {
    let s = scale;
    let leg = walk.sin() * 0.28 * s;
    part(
        b,
        pos,
        yaw,
        vec3(-0.22 * s, 0.45 * s, leg),
        vec3(0.14 * s, 0.45 * s, 0.16 * s),
        look.legs,
    );
    part(
        b,
        pos,
        yaw,
        vec3(0.22 * s, 0.45 * s, -leg),
        vec3(0.14 * s, 0.45 * s, 0.16 * s),
        look.legs,
    );
    part(
        b,
        pos,
        yaw,
        vec3(0.0, 1.3 * s, 0.0),
        vec3(0.4 * s, 0.45 * s, 0.22 * s),
        look.body,
    );
    ball(b, pos, yaw, vec3(0.0, 2.0 * s, 0.0), 0.28 * s, look.skin);
    let arm_l = -leg * 0.8;
    let arm_r = leg * 0.8 + swing * 0.9;
    part(
        b,
        pos,
        yaw,
        vec3(-0.56 * s, 1.3 * s, arm_l),
        vec3(0.11 * s, 0.4 * s, 0.13 * s),
        look.body,
    );
    part(
        b,
        pos,
        yaw,
        vec3(0.56 * s, 1.3 * s, arm_r),
        vec3(0.11 * s, 0.4 * s, 0.13 * s),
        look.body,
    );
    extra(b, pos, yaw, s, arm_r);
}

pub fn draw_player(b: &mut Batch, p: &Player, t: f32) {
    if p.dead {
        // fallen hero
        let c = Class::color(p.class);
        b.cuboid(
            p.pos + vec3(0.0, 0.25, 0.0),
            vec3(0.5, 0.22, 0.9),
            p.yaw,
            rgb(c[0] / 2, c[1] / 2, c[2] / 2),
        );
        b.sphere(p.pos + rotate_y(vec3(0.0, 0.3, 1.2), p.yaw), 0.28, rgb(220, 180, 150));
        return;
    }
    let c = p.class.color();
    let look = Look {
        body: rgb(c[0], c[1], c[2]),
        legs: rgb(60, 52, 48),
        skin: rgb(226, 184, 150),
    };
    let walk = if p.moving && p.grounded { t * 11.0 } else { 0.0 };
    let swing = (p.swing_t * 3.0).min(1.0);
    let class = p.class;
    humanoid(
        b,
        p.pos,
        p.yaw,
        1.0,
        &look,
        walk,
        swing,
        move |b, pos, yaw, s, arm| match class {
            Class::Warrior => {
                part(
                    b,
                    pos,
                    yaw,
                    vec3(0.56 * s, 1.55 * s, arm + 0.6),
                    vec3(0.05, 0.08, 0.7),
                    rgb(200, 204, 214),
                );
                part(
                    b,
                    pos,
                    yaw,
                    vec3(-0.78 * s, 1.3 * s, 0.0),
                    vec3(0.06, 0.45, 0.4),
                    rgb(150, 50, 40),
                );
                part(
                    b,
                    pos,
                    yaw,
                    vec3(0.0, 2.15 * s, 0.0),
                    vec3(0.3, 0.14, 0.3),
                    rgb(150, 154, 166),
                );
            }
            Class::Mage => {
                part(
                    b,
                    pos,
                    yaw,
                    vec3(0.62 * s, 1.4 * s, arm + 0.1),
                    vec3(0.04, 1.2, 0.04),
                    rgb(110, 76, 44),
                );
                ball(b, pos, yaw, vec3(0.62 * s, 2.7 * s, arm + 0.1), 0.2, rgb(110, 210, 255));
                b.cone(pos + vec3(0.0, 2.2 * s, 0.0), 0.36, 0.8, 6, yaw, rgb(50, 70, 170));
            }
            Class::Priest => {
                part(
                    b,
                    pos,
                    yaw,
                    vec3(0.62 * s, 1.3 * s, arm + 0.2),
                    vec3(0.05, 0.9, 0.05),
                    rgb(240, 220, 150),
                );
                ball(b, pos, yaw, vec3(0.62 * s, 2.3 * s, arm + 0.2), 0.2, rgb(255, 245, 170));
                part(
                    b,
                    pos,
                    yaw,
                    vec3(0.0, 0.9 * s, 0.0),
                    vec3(0.45 * s, 0.5, 0.26 * s),
                    rgb(236, 230, 200),
                );
            }
        },
    );
}

pub fn draw_npc(b: &mut Batch, n: &Npc, t: f32) {
    let (body, legs) = match n.role {
        NpcRole::QuestGiver => (rgb(70, 110, 170), rgb(50, 50, 60)),
        NpcRole::Vendor => (rgb(150, 110, 60), rgb(80, 60, 40)),
    };
    let look = Look {
        body,
        legs,
        skin: rgb(214, 170, 140),
    };
    let role = n.role;
    humanoid(
        b,
        n.pos,
        n.yaw,
        1.0,
        &look,
        0.0,
        (t * 1.5).sin() * 0.05,
        move |b, pos, yaw, s, _| match role {
            NpcRole::QuestGiver => {
                part(
                    b,
                    pos,
                    yaw,
                    vec3(0.0, 2.2 * s, 0.0),
                    vec3(0.3, 0.12, 0.3),
                    rgb(170, 170, 180),
                );
                part(
                    b,
                    pos,
                    yaw,
                    vec3(-0.7 * s, 0.9 * s, 0.1),
                    vec3(0.04, 1.1, 0.04),
                    rgb(100, 70, 40),
                );
            }
            NpcRole::Vendor => {
                part(
                    b,
                    pos,
                    yaw,
                    vec3(0.0, 1.3 * s, -0.4),
                    vec3(0.4, 0.4, 0.18),
                    rgb(110, 76, 44),
                );
            }
        },
    );
}

fn leg_set(b: &mut Batch, pos: Vec3, yaw: f32, s: f32, walk: f32, x: f32, z: f32, h: f32, col: Color) {
    let sw = walk.sin() * 0.25 * s;
    part(
        b,
        pos,
        yaw,
        vec3(-x * s, h * 0.5 * s, z * s + sw),
        vec3(0.1 * s, h * 0.5 * s, 0.1 * s),
        col,
    );
    part(
        b,
        pos,
        yaw,
        vec3(x * s, h * 0.5 * s, z * s - sw),
        vec3(0.1 * s, h * 0.5 * s, 0.1 * s),
        col,
    );
}

pub fn draw_mob(b: &mut Batch, m: &Mob, t: f32, idx: usize) {
    let s = m.kind.scale();
    let yaw = m.yaw;
    let pos = m.pos;
    if m.state == MobState::Dead {
        // corpse: low, tilted-looking lump that sinks away shortly before respawn
        let sink = ((m.respawn_at as f32 - t).max(0.0) / 5.0).min(1.0);
        if sink <= 0.0 {
            return;
        }
        let col = match m.kind {
            MobKind::Boar => rgb(92, 62, 46),
            MobKind::Wolf => rgb(110, 110, 116),
            MobKind::Bandit => rgb(120, 60, 50),
            MobKind::Gnarlfang => rgb(54, 50, 60),
        };
        b.cuboid(
            pos + vec3(0.0, 0.2 * s * sink, 0.0),
            vec3(0.8 * s, 0.2 * s * sink, 0.5 * s),
            yaw,
            col,
        );
        if m.loot.is_some() {
            let bob = (t * 3.0 + idx as f32).sin() * 0.12;
            b.sphere(pos + vec3(0.0, 1.3 + bob, 0.0), 0.16, rgb(255, 215, 80));
        }
        return;
    }
    let moving = matches!(m.state, MobState::Chase | MobState::Return) || m.wander_to.is_some();
    let walk = if moving { t * 10.0 + idx as f32 } else { 0.0 };
    let lunge = (m.swing_t * 3.0).min(1.0) * 0.4 * s;
    let origin = pos + rotate_y(vec3(0.0, 0.0, lunge), yaw);
    match m.kind {
        MobKind::Boar => {
            let c = rgb(110, 76, 54);
            part(
                b,
                origin,
                yaw,
                vec3(0.0, 0.75 * s, 0.0),
                vec3(0.55 * s, 0.45 * s, 0.85 * s),
                c,
            );
            part(
                b,
                origin,
                yaw,
                vec3(0.0, 0.7 * s, 1.0 * s),
                vec3(0.34 * s, 0.32 * s, 0.34 * s),
                rgb(124, 86, 62),
            );
            part(
                b,
                origin,
                yaw,
                vec3(-0.18 * s, 0.55 * s, 1.32 * s),
                vec3(0.05 * s, 0.05 * s, 0.18 * s),
                rgb(240, 236, 220),
            );
            part(
                b,
                origin,
                yaw,
                vec3(0.18 * s, 0.55 * s, 1.32 * s),
                vec3(0.05 * s, 0.05 * s, 0.18 * s),
                rgb(240, 236, 220),
            );
            for i in 0..4 {
                part(
                    b,
                    origin,
                    yaw,
                    vec3(0.0, 1.15 * s + i as f32 * 0.0, -0.5 * s + i as f32 * 0.33 * s),
                    vec3(0.05 * s, 0.14 * s, 0.1 * s),
                    rgb(60, 40, 30),
                );
            }
            leg_set(b, origin, yaw, s, walk, 0.35, 0.55, 0.5, rgb(80, 56, 40));
            leg_set(
                b,
                origin,
                yaw,
                s,
                walk + std::f32::consts::PI,
                0.35,
                -0.55,
                0.5,
                rgb(80, 56, 40),
            );
        }
        MobKind::Wolf | MobKind::Gnarlfang => {
            let boss = m.kind == MobKind::Gnarlfang;
            let c = if boss { rgb(52, 48, 62) } else { rgb(122, 122, 130) };
            let dark = if boss { rgb(36, 32, 44) } else { rgb(88, 88, 96) };
            part(
                b,
                origin,
                yaw,
                vec3(0.0, 0.95 * s, 0.0),
                vec3(0.34 * s, 0.38 * s, 0.9 * s),
                c,
            );
            part(
                b,
                origin,
                yaw,
                vec3(0.0, 1.15 * s, 1.0 * s),
                vec3(0.26 * s, 0.26 * s, 0.3 * s),
                c,
            );
            part(
                b,
                origin,
                yaw,
                vec3(0.0, 1.05 * s, 1.4 * s),
                vec3(0.14 * s, 0.12 * s, 0.22 * s),
                dark,
            );
            part(
                b,
                origin,
                yaw,
                vec3(-0.15 * s, 1.5 * s, 0.95 * s),
                vec3(0.07 * s, 0.14 * s, 0.05 * s),
                dark,
            );
            part(
                b,
                origin,
                yaw,
                vec3(0.15 * s, 1.5 * s, 0.95 * s),
                vec3(0.07 * s, 0.14 * s, 0.05 * s),
                dark,
            );
            part(
                b,
                origin,
                yaw,
                vec3(0.0, 1.05 * s, -1.05 * s),
                vec3(0.09 * s, 0.09 * s, 0.35 * s),
                dark,
            );
            let eye = if boss { rgb(255, 60, 40) } else { rgb(250, 220, 90) };
            part(
                b,
                origin,
                yaw,
                vec3(-0.12 * s, 1.25 * s, 1.27 * s),
                vec3(0.04 * s, 0.04 * s, 0.03 * s),
                eye,
            );
            part(
                b,
                origin,
                yaw,
                vec3(0.12 * s, 1.25 * s, 1.27 * s),
                vec3(0.04 * s, 0.04 * s, 0.03 * s),
                eye,
            );
            leg_set(b, origin, yaw, s, walk, 0.22, 0.6, 0.75, dark);
            leg_set(b, origin, yaw, s, walk + std::f32::consts::PI, 0.22, -0.6, 0.75, dark);
            if boss {
                for i in 0..5 {
                    b.cone(
                        origin + rotate_y(vec3(0.0, 1.3 * s, -0.7 * s + i as f32 * 0.42 * s), yaw),
                        0.15 * s,
                        0.6 * s,
                        4,
                        0.0,
                        rgb(200, 190, 210),
                    );
                }
            }
        }
        MobKind::Bandit => {
            let look = Look {
                body: rgb(122, 52, 44),
                legs: rgb(56, 48, 40),
                skin: rgb(200, 160, 130),
            };
            humanoid(
                b,
                origin,
                yaw,
                s,
                &look,
                walk,
                (m.swing_t * 3.0).min(1.0),
                |b, pos, yaw, s, arm| {
                    part(
                        b,
                        pos,
                        yaw,
                        vec3(0.56 * s, 1.35 * s, arm + 0.45),
                        vec3(0.04, 0.06, 0.45),
                        rgb(190, 190, 200),
                    );
                    b.cone(pos + vec3(0.0, 2.15 * s, 0.0), 0.34, 0.5, 6, yaw, rgb(40, 34, 34));
                },
            );
        }
    }
}

pub fn draw_ring(center: Vec3, radius: f32, col: Color) {
    let n = 28;
    for i in 0..n {
        let a0 = i as f32 / n as f32 * std::f32::consts::TAU;
        let a1 = (i + 1) as f32 / n as f32 * std::f32::consts::TAU;
        let p0 = at(center.x + a0.sin() * radius, center.z + a0.cos() * radius) + vec3(0.0, 0.08, 0.0);
        let p1 = at(center.x + a1.sin() * radius, center.z + a1.cos() * radius) + vec3(0.0, 0.08, 0.0);
        draw_line_3d(p0, p1, col);
    }
}

pub fn draw_fire(b: &mut Batch, base: Vec3, t: f32) {
    let f = 1.0 + (t * 11.0).sin() * 0.15;
    b.cone(base + vec3(0.0, 0.2, 0.0), 0.55, 1.3 * f, 5, t, rgb(255, 130, 30));
    b.cone(base + vec3(0.0, 0.2, 0.0), 0.3, 0.9 * f, 5, -t, rgb(255, 220, 90));
}
