//! The game simulation: player, creatures, combat, loot and quests.
//! Headless (no rendering, no input devices) so it can be unit-tested.

use crate::data::*;
use crate::rng::Rng;
use crate::terrain;
use macroquad::math::{vec2, vec3, Vec2, Vec3};
use serde::{Deserialize, Serialize};

pub const PLAYER_SPEED: f32 = 7.0;
pub const GCD: f64 = 1.5;
pub const INVENTORY_SIZE: usize = 24;
pub const INTERACT_RANGE: f32 = 5.0;
pub const LOOT_RANGE: f32 = 4.5;
const COMBAT_TIMEOUT: f64 = 6.0;
const LEASH: f32 = 60.0;
pub const SPAWN: Vec3 = Vec3::new(0.0, 0.0, 7.0);

// ---------------------------------------------------------------- events

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum FloatKind {
    Damage,
    Crit,
    Taken,
    Heal,
    Info,
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum LogKind {
    Combat,
    System,
    Loot,
    Quest,
}

#[derive(Clone, Debug)]
pub enum Event {
    Float {
        pos: Vec3,
        text: String,
        kind: FloatKind,
    },
    Log {
        text: String,
        kind: LogKind,
    },
    LevelUp(u32),
    PlayerDied,
    Dialog {
        speaker: String,
        text: String,
    },
    /// A spell bolt travelling from `from` to `to`.
    Bolt {
        from: Vec3,
        to: Vec3,
        color: [u8; 3],
    },
    /// An expanding ring (nova, heal, shield).
    Ring {
        pos: Vec3,
        radius: f32,
        color: [u8; 3],
    },
}

// ---------------------------------------------------------------- state

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum MobState {
    Idle,
    Chase,
    Return,
    Dead,
}

#[derive(Clone, Debug)]
pub struct Dot {
    pub next: f64,
    pub left: u32,
    pub interval: f32,
    pub dmg: f32,
}

#[derive(Clone, Debug, Default)]
pub struct Loot {
    pub copper: u32,
    pub items: Vec<Item>,
}

#[derive(Clone, Debug)]
pub struct Mob {
    pub kind: MobKind,
    pub level: u32,
    pub pos: Vec3,
    pub home: Vec3,
    pub yaw: f32,
    pub hp: f32,
    pub max_hp: f32,
    pub state: MobState,
    pub wander_to: Option<Vec2>,
    pub next_wander: f64,
    pub attack_at: f64,
    pub swing_t: f32,
    pub rooted_until: f64,
    pub slowed_until: f64,
    pub slow_factor: f32,
    pub dots: Vec<Dot>,
    pub respawn_at: f64,
    pub loot: Option<Loot>,
    pub death_time: f64,
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum NpcRole {
    QuestGiver,
    Vendor,
}

#[derive(Clone, Debug)]
pub struct Npc {
    pub name: &'static str,
    pub title: &'static str,
    pub pos: Vec3,
    pub yaw: f32,
    pub role: NpcRole,
}

#[derive(Clone, Copy, Debug)]
pub struct Cast {
    pub ability: usize,
    pub start: f64,
    pub end: f64,
    pub target: Option<usize>,
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq)]
pub struct QuestProgress {
    pub id: u32,
    pub count: u32,
}

#[derive(Clone, Debug)]
pub struct Player {
    pub class: Class,
    pub level: u32,
    pub xp: u32,
    pub copper: u32,
    pub pos: Vec3,
    pub vy: f32,
    pub grounded: bool,
    pub yaw: f32,
    pub hp: f32,
    pub res: f32,
    pub target: Option<usize>,
    pub cast: Option<Cast>,
    pub gcd_end: f64,
    pub cd: [f64; 4],
    pub auto: bool,
    pub auto_at: f64,
    pub shield: f32,
    pub shield_until: f64,
    pub combat_until: f64,
    pub dead: bool,
    pub moving: bool,
    pub swing_t: f32,
    pub inventory: Vec<Item>,
    pub equipment: [Option<Item>; 3],
    pub quests: Vec<QuestProgress>,
    pub done_quests: Vec<u32>,
}

impl Player {
    pub fn new(class: Class) -> Player {
        let mut p = Player {
            class,
            level: 1,
            xp: 0,
            copper: 0,
            pos: SPAWN,
            vy: 0.0,
            grounded: true,
            yaw: std::f32::consts::PI,
            hp: 0.0,
            res: 0.0,
            target: None,
            cast: None,
            gcd_end: 0.0,
            cd: [0.0; 4],
            auto: false,
            auto_at: 0.0,
            shield: 0.0,
            shield_until: 0.0,
            combat_until: 0.0,
            dead: false,
            moving: false,
            swing_t: 0.0,
            inventory: Vec::new(),
            equipment: [None, None, None],
            quests: Vec::new(),
            done_quests: Vec::new(),
        };
        p.pos.y = terrain::height(p.pos.x, p.pos.z);
        p.hp = p.max_hp();
        p.res = if class.resource() == Resource::Mana {
            p.max_res()
        } else {
            0.0
        };
        p
    }

    pub fn max_hp(&self) -> f32 {
        self.class.base_hp() + self.class.hp_per_level() * (self.level as f32 - 1.0)
    }

    pub fn max_res(&self) -> f32 {
        self.class.max_resource(self.level)
    }

    pub fn power(&self) -> f32 {
        10.0 + 3.0 * (self.level as f32 - 1.0) + self.equipment.iter().flatten().map(|i| i.power).sum::<f32>()
    }

    pub fn armor(&self) -> f32 {
        self.class.base_armor()
            + 3.0 * self.level as f32
            + self.equipment.iter().flatten().map(|i| i.armor).sum::<f32>()
    }

    pub fn in_combat(&self, now: f64) -> bool {
        now < self.combat_until
    }

    pub fn quest_progress(&self, id: u32) -> Option<&QuestProgress> {
        self.quests.iter().find(|q| q.id == id)
    }
}

/// Everything the player wants to do this frame.
#[derive(Default, Clone)]
pub struct Intent {
    pub move_dir: Vec2,
    pub jump: bool,
    pub face_yaw: Option<f32>,
    pub ability: Option<usize>,
    pub cycle_target: bool,
    pub set_target: Option<Option<usize>>,
    pub toggle_auto: bool,
    pub interact: bool,
    pub respawn: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SaveData {
    pub class: Class,
    pub level: u32,
    pub xp: u32,
    pub copper: u32,
    pub inventory: Vec<Item>,
    pub equipment: [Option<Item>; 3],
    pub quests: Vec<QuestProgress>,
    pub done_quests: Vec<u32>,
}

pub struct World {
    pub time: f64,
    pub player: Player,
    pub mobs: Vec<Mob>,
    pub npcs: Vec<Npc>,
    pub events: Vec<Event>,
    rng: Rng,
}

fn flat_dist(a: Vec3, b: Vec3) -> f32 {
    vec2(a.x - b.x, a.z - b.z).length()
}

impl World {
    pub fn new(class: Class, seed: u64) -> World {
        let mut w = World {
            time: 0.0,
            player: Player::new(class),
            mobs: Vec::new(),
            npcs: Vec::new(),
            events: Vec::new(),
            rng: Rng::new(seed),
        };
        w.spawn_creatures();
        w.spawn_npcs();
        w
    }

    pub fn from_save(save: SaveData, seed: u64) -> World {
        let mut w = World::new(save.class, seed);
        let p = &mut w.player;
        p.level = save.level.clamp(1, MAX_LEVEL);
        p.xp = save.xp;
        p.copper = save.copper;
        p.inventory = save.inventory;
        p.equipment = save.equipment;
        p.quests = save.quests;
        p.done_quests = save.done_quests;
        p.hp = p.max_hp();
        p.res = if p.class.resource() == Resource::Mana {
            p.max_res()
        } else {
            0.0
        };
        w
    }

    pub fn to_save(&self) -> SaveData {
        let p = &self.player;
        SaveData {
            class: p.class,
            level: p.level,
            xp: p.xp,
            copper: p.copper,
            inventory: p.inventory.clone(),
            equipment: p.equipment.clone(),
            quests: p.quests.clone(),
            done_quests: p.done_quests.clone(),
        }
    }

    // ------------------------------------------------------------ spawning

    fn spawn_creatures(&mut self) {
        let groups: [(MobKind, (f32, f32), f32, u32); 5] = [
            (MobKind::Boar, (4.0, 50.0), 24.0, 12),
            (MobKind::Boar, (-52.0, 22.0), 14.0, 6),
            (MobKind::Wolf, (58.0, 8.0), 24.0, 12),
            (MobKind::Bandit, (-58.0, -58.0), 8.0, 8),
            (MobKind::Gnarlfang, (66.0, -62.0), 0.0, 1),
        ];
        for (kind, (cx, cz), radius, count) in groups {
            for _ in 0..count {
                let (x, z) = loop {
                    let a = self.rng.range(0.0, std::f32::consts::TAU);
                    let r = radius * self.rng.f32().sqrt();
                    let (x, z) = (cx + a.cos() * r, cz + a.sin() * r);
                    if !terrain::in_safe_zone(x, z) && x.abs() < terrain::HALF - 12.0 && z.abs() < terrain::HALF - 12.0
                    {
                        break (x, z);
                    }
                };
                let (lo, hi) = kind.level_range();
                let level = self.rng.int(lo, hi);
                let pos = vec3(x, terrain::height(x, z), z);
                let max_hp = mob_hp(level, kind);
                self.mobs.push(Mob {
                    kind,
                    level,
                    pos,
                    home: pos,
                    yaw: self.rng.range(0.0, std::f32::consts::TAU),
                    hp: max_hp,
                    max_hp,
                    state: MobState::Idle,
                    wander_to: None,
                    next_wander: self.rng.range(1.0, 6.0) as f64,
                    attack_at: 0.0,
                    swing_t: 0.0,
                    rooted_until: 0.0,
                    slowed_until: 0.0,
                    slow_factor: 1.0,
                    dots: Vec::new(),
                    respawn_at: 0.0,
                    loot: None,
                    death_time: 0.0,
                });
            }
        }
    }

    fn spawn_npcs(&mut self) {
        let mk = |name, title, x: f32, z: f32, yaw, role| Npc {
            name,
            title,
            pos: vec3(x, terrain::height(x, z), z),
            yaw,
            role,
        };
        self.npcs.push(mk(
            "Warden Maren",
            "Captain of the Watch",
            -4.5,
            0.0,
            1.6,
            NpcRole::QuestGiver,
        ));
        self.npcs
            .push(mk("Tolly Brass", "Quartermaster", 6.0, -2.0, -1.6, NpcRole::Vendor));
    }

    // ------------------------------------------------------------- queries

    pub fn mob_radius(m: &Mob) -> f32 {
        0.9 * m.kind.scale()
    }

    pub fn dist_to_mob(&self, i: usize) -> f32 {
        let m = &self.mobs[i];
        (flat_dist(self.player.pos, m.pos) - Self::mob_radius(m)).max(0.0)
    }

    pub fn quest_state(&self, q: &QuestDef) -> QuestState {
        if self.player.done_quests.contains(&q.id) {
            return QuestState::Done;
        }
        if let Some(p) = self.player.quest_progress(q.id) {
            return if p.count >= q.count {
                QuestState::ReadyToTurnIn
            } else {
                QuestState::Active
            };
        }
        match q.requires {
            Some(r) if !self.player.done_quests.contains(&r) => QuestState::Locked,
            _ => QuestState::Available,
        }
    }

    /// Marker over a quest giver: '!' available, '?' ready, ' ' otherwise.
    pub fn npc_marker(&self, npc: &Npc) -> Option<char> {
        if npc.role != NpcRole::QuestGiver {
            return None;
        }
        let mut marker = None;
        for q in QUESTS.iter() {
            match self.quest_state(q) {
                QuestState::ReadyToTurnIn => return Some('?'),
                QuestState::Available => marker = Some('!'),
                _ => {}
            }
        }
        marker
    }

    pub fn push_log(&mut self, text: impl Into<String>, kind: LogKind) {
        self.events.push(Event::Log {
            text: text.into(),
            kind,
        });
    }

    fn float(&mut self, pos: Vec3, text: impl Into<String>, kind: FloatKind) {
        self.events.push(Event::Float {
            pos: pos + vec3(0.0, 2.2, 0.0),
            text: text.into(),
            kind,
        });
    }

    // -------------------------------------------------------------- update

    pub fn update(&mut self, dt: f32, input: &Intent) {
        self.time += dt as f64;
        self.update_player(dt, input);
        self.update_mobs(dt);
        self.update_dots();
        self.regen(dt);
    }

    fn update_player(&mut self, dt: f32, input: &Intent) {
        let now = self.time;
        if self.player.dead {
            if input.respawn {
                self.respawn_player();
            }
            return;
        }

        // targeting
        if input.cycle_target {
            self.cycle_target();
        }
        if let Some(t) = input.set_target {
            self.player.target = t.filter(|&i| i < self.mobs.len() && self.mobs[i].state != MobState::Dead);
            if self.player.target.is_none() {
                self.player.auto = false;
            }
        }
        if let Some(t) = self.player.target {
            if self.mobs[t].state == MobState::Dead {
                self.player.target = None;
                self.player.auto = false;
            }
        }
        if input.toggle_auto && self.player.target.is_some() {
            self.player.auto = !self.player.auto;
        }

        // movement
        let mut dir = input.move_dir;
        let moving = dir.length_squared() > 1e-4;
        if moving {
            dir = dir.normalize();
        }
        self.player.moving = moving;
        if moving {
            let p = &mut self.player;
            let (nx, nz) =
                terrain::clamp_to_world(p.pos.x + dir.x * PLAYER_SPEED * dt, p.pos.z + dir.y * PLAYER_SPEED * dt);
            p.pos.x = nx;
            p.pos.z = nz;
            if p.cast.take().is_some() {
                self.push_log("Cast interrupted.", LogKind::Combat);
            }
        }
        {
            let target_pos = self.player.target.map(|t| self.mobs[t].pos);
            let p = &mut self.player;
            if let Some(y) = input.face_yaw {
                p.yaw = y;
            } else if let (true, Some(tp)) = (p.auto && !moving, target_pos) {
                p.yaw = (tp.x - p.pos.x).atan2(tp.z - p.pos.z);
            } else if moving {
                p.yaw = dir.x.atan2(dir.y);
            }
            let ground = terrain::height(p.pos.x, p.pos.z);
            if p.grounded && input.jump {
                p.vy = 8.0;
                p.grounded = false;
            }
            p.vy -= 22.0 * dt;
            p.pos.y += p.vy * dt;
            if p.pos.y <= ground {
                p.pos.y = ground;
                p.vy = 0.0;
                p.grounded = true;
            } else {
                p.grounded = false;
            }
            p.swing_t = (p.swing_t - dt).max(0.0);
        }

        // abilities
        if let Some(idx) = input.ability {
            self.use_ability(idx);
        }
        if let Some(c) = self.player.cast {
            if now >= c.end {
                self.player.cast = None;
                self.execute_ability(c.ability, c.target);
            }
        }

        // auto-attack
        if self.player.auto && self.player.cast.is_none() {
            if let Some(t) = self.player.target {
                let (range, frac, interval) = self.player.class.auto_attack();
                if self.dist_to_mob(t) <= range && now >= self.player.auto_at {
                    self.player.auto_at = now + interval as f64;
                    self.player.swing_t = 0.3;
                    let (dmg, crit) = self.roll(self.player.power() * frac);
                    if self.player.class == Class::Warrior {
                        self.player.res = (self.player.res + 8.0).min(self.player.max_res());
                    }
                    self.damage_mob(t, dmg, crit);
                }
            }
        }
    }

    fn cycle_target(&mut self) {
        let p = self.player.pos;
        let mut cands: Vec<(usize, f32)> = self
            .mobs
            .iter()
            .enumerate()
            .filter(|(_, m)| m.state != MobState::Dead)
            .map(|(i, m)| (i, flat_dist(p, m.pos)))
            .filter(|&(_, d)| d < 40.0)
            .collect();
        cands.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap());
        if cands.is_empty() {
            return;
        }
        let next = match self.player.target.and_then(|t| cands.iter().position(|&(i, _)| i == t)) {
            Some(pos) => cands[(pos + 1) % cands.len()].0,
            None => cands[0].0,
        };
        self.player.target = Some(next);
    }

    fn roll(&mut self, base: f32) -> (f32, bool) {
        let v = self.rng.range(0.9, 1.1);
        let crit = self.rng.chance(0.08);
        ((base * v * if crit { 1.7 } else { 1.0 }).max(1.0).round(), crit)
    }

    // ------------------------------------------------------------ abilities

    pub fn ability_cooldown_left(&self, idx: usize) -> f32 {
        (self.player.cd[idx] - self.time).max(0.0) as f32
    }

    fn use_ability(&mut self, idx: usize) {
        if idx >= 4 || self.player.dead {
            return;
        }
        let now = self.time;
        let def = self.player.class.abilities()[idx];
        if self.player.cast.is_some() {
            return;
        }
        if now < self.player.gcd_end || now < self.player.cd[idx] {
            self.push_log(format!("{} is not ready yet.", def.name), LogKind::System);
            return;
        }
        if self.player.res < def.cost {
            let r = self.player.class.resource().name();
            self.push_log(format!("Not enough {r}."), LogKind::System);
            return;
        }
        let mut target = None;
        if def.needs_target() {
            match self.player.target {
                Some(t) if self.mobs[t].state != MobState::Dead => target = Some(t),
                _ => {
                    self.push_log("You need a target (Tab or click).", LogKind::System);
                    return;
                }
            }
            if self.dist_to_mob(target.unwrap()) > def.range {
                self.push_log("Target is out of range.", LogKind::System);
                return;
            }
        }
        self.player.gcd_end = now + GCD;
        if def.cast > 0.0 {
            self.player.cast = Some(Cast {
                ability: idx,
                start: now,
                end: now + def.cast as f64,
                target,
            });
        } else {
            self.execute_ability(idx, target);
        }
    }

    fn ability_color(&self, idx: usize) -> [u8; 3] {
        match (self.player.class, idx) {
            (Class::Warrior, _) => [255, 160, 80],
            (Class::Mage, 0) => [120, 200, 255],
            (Class::Mage, 1) => [255, 130, 40],
            (Class::Mage, _) => [150, 190, 255],
            (Class::Priest, 0) => [255, 240, 150],
            (Class::Priest, 1) => [140, 255, 160],
            (Class::Priest, 2) => [255, 255, 255],
            (Class::Priest, _) => [170, 90, 220],
        }
    }

    fn fx_bolt(&mut self, idx: usize, target: usize) {
        let color = self.ability_color(idx);
        let from = self.player.pos + vec3(0.0, 1.5, 0.0);
        let to = self.mobs[target].pos + vec3(0.0, 0.8, 0.0);
        self.events.push(Event::Bolt { from, to, color });
    }

    fn execute_ability(&mut self, idx: usize, target: Option<usize>) {
        let now = self.time;
        let def = self.player.class.abilities()[idx];
        if self.player.res < def.cost {
            return;
        }
        if let Some(t) = target {
            if self.mobs[t].state == MobState::Dead || self.dist_to_mob(t) > def.range + 1.5 {
                self.push_log("Target is gone or out of range.", LogKind::System);
                return;
            }
        }
        self.player.res -= def.cost;
        self.player.cd[idx] = now + def.cooldown as f64;
        self.player.swing_t = 0.35;
        let power = self.player.power();
        match def.effect {
            Effect::Strike { mult } => {
                let (d, c) = self.roll(power * mult);
                self.damage_mob(target.unwrap(), d, c);
            }
            Effect::Spell {
                base,
                coef,
                slow,
                slow_secs,
            } => {
                let t = target.unwrap();
                self.fx_bolt(idx, t);
                let (d, c) = self.roll(base + power * coef);
                if slow > 0.0 && self.mobs[t].state != MobState::Return {
                    let m = &mut self.mobs[t];
                    m.slowed_until = now + slow_secs as f64;
                    m.slow_factor = slow;
                }
                self.damage_mob(t, d, c);
            }
            Effect::Dot {
                per_tick,
                coef,
                ticks,
                interval,
            } => {
                let t = target.unwrap();
                if self.mobs[t].state == MobState::Return {
                    return;
                }
                self.fx_bolt(idx, t);
                let dmg = (per_tick + power * coef).round();
                self.mobs[t].dots.push(Dot {
                    next: now + interval as f64,
                    left: ticks,
                    interval,
                    dmg,
                });
                self.engage(t);
                self.push_log(
                    format!("{} afflicts {}.", def.name, self.mobs[t].kind.name()),
                    LogKind::Combat,
                );
            }
            Effect::Heal { base, coef } => {
                let (amt, crit) = self.roll(base + power * coef);
                let p = &mut self.player;
                let before = p.hp;
                p.hp = (p.hp + amt).min(p.max_hp());
                let healed = (p.hp - before).round() as i32;
                let pos = p.pos;
                self.float(
                    pos,
                    format!("+{healed}"),
                    if crit { FloatKind::Crit } else { FloatKind::Heal },
                );
                let color = self.ability_color(idx);
                self.events.push(Event::Ring {
                    pos,
                    radius: 1.8,
                    color,
                });
            }
            Effect::Shield { base, coef, secs } => {
                self.player.shield = base + power * coef;
                self.player.shield_until = now + secs as f64;
                let pos = self.player.pos;
                self.float(pos, "Shielded", FloatKind::Info);
                let color = self.ability_color(idx);
                self.events.push(Event::Ring {
                    pos,
                    radius: 2.2,
                    color,
                });
            }
            Effect::Nova {
                radius,
                base,
                coef,
                root_secs,
            } => {
                let ppos = self.player.pos;
                let color = self.ability_color(idx);
                self.events.push(Event::Ring {
                    pos: ppos,
                    radius,
                    color,
                });
                let hits: Vec<usize> = (0..self.mobs.len())
                    .filter(|&i| self.mobs[i].state != MobState::Dead && self.mobs[i].state != MobState::Return)
                    .filter(|&i| flat_dist(ppos, self.mobs[i].pos) <= radius)
                    .collect();
                for i in hits {
                    self.mobs[i].rooted_until = now + root_secs as f64;
                    let (d, c) = self.roll(base + power * coef);
                    self.damage_mob(i, d, c);
                }
            }
            Effect::Blink { dist } => {
                let p = &mut self.player;
                let (nx, nz) = terrain::clamp_to_world(p.pos.x + p.yaw.sin() * dist, p.pos.z + p.yaw.cos() * dist);
                p.pos.x = nx;
                p.pos.z = nz;
                p.pos.y = terrain::height(nx, nz);
                p.vy = 0.0;
            }
            Effect::Charge { mult, rage } => {
                let t = target.unwrap();
                let mpos = self.mobs[t].pos;
                let p = &mut self.player;
                let to = vec2(mpos.x - p.pos.x, mpos.z - p.pos.z);
                let len = to.length().max(0.001);
                let stop = (len - 2.4).max(0.0);
                let step = to / len * stop;
                p.pos.x += step.x;
                p.pos.z += step.y;
                p.pos.y = terrain::height(p.pos.x, p.pos.z);
                p.yaw = to.x.atan2(to.y);
                p.res = (p.res + rage).min(100.0);
                let (d, c) = self.roll(power * mult);
                self.mobs[t].rooted_until = now + 1.0;
                self.damage_mob(t, d, c);
            }
        }
    }

    // --------------------------------------------------------------- combat

    fn engage(&mut self, i: usize) {
        let now = self.time;
        self.player.combat_until = now + COMBAT_TIMEOUT;
        let m = &mut self.mobs[i];
        if m.state == MobState::Idle {
            m.state = MobState::Chase;
            m.wander_to = None;
            m.attack_at = m.attack_at.max(now + 1.0);
        }
    }

    fn damage_mob(&mut self, i: usize, amount: f32, crit: bool) {
        if self.mobs[i].state == MobState::Dead || self.mobs[i].state == MobState::Return {
            if self.mobs[i].state == MobState::Return {
                let pos = self.mobs[i].pos;
                self.float(pos, "Evading", FloatKind::Info);
            }
            return;
        }
        self.engage(i);
        let m = &mut self.mobs[i];
        m.hp -= amount;
        let pos = m.pos + vec3(0.0, 0.4 * m.kind.scale(), 0.0);
        let dead = m.hp <= 0.0;
        self.float(
            pos,
            format!("{}", amount as i32),
            if crit { FloatKind::Crit } else { FloatKind::Damage },
        );
        if dead {
            self.kill_mob(i);
        }
    }

    fn kill_mob(&mut self, i: usize) {
        let now = self.time;
        let (kind, level, pos) = {
            let m = &mut self.mobs[i];
            m.state = MobState::Dead;
            m.hp = 0.0;
            m.dots.clear();
            m.respawn_at = now + m.kind.respawn_secs();
            m.death_time = now;
            (m.kind, m.level, m.pos)
        };
        let loot = self.roll_loot(kind, level);
        self.mobs[i].loot = Some(loot);
        if self.player.target == Some(i) {
            self.player.target = None;
            self.player.auto = false;
        }
        self.push_log(format!("{} dies.", kind.name()), LogKind::Combat);
        let xp = mob_xp(self.player.level, level, kind);
        if xp > 0 {
            self.award_xp(xp);
            self.float(pos, format!("+{xp} XP"), FloatKind::Info);
        }
        // quest progress
        let mut notes: Vec<String> = Vec::new();
        for qp in self.player.quests.iter_mut() {
            if let Some(def) = quest(qp.id) {
                if def.kind == kind && qp.count < def.count {
                    qp.count += 1;
                    notes.push(if qp.count >= def.count {
                        format!("{}: objective complete - return to Warden Maren.", def.name)
                    } else {
                        format!("{}: {} {}/{}", def.name, kind.plural(), qp.count, def.count)
                    });
                }
            }
        }
        for n in notes {
            self.push_log(n, LogKind::Quest);
        }
    }

    fn roll_loot(&mut self, kind: MobKind, level: u32) -> Loot {
        let mut loot = Loot {
            copper: self.rng.int(1, 3) * level + self.rng.int(0, 4),
            items: Vec::new(),
        };
        if kind.elite() {
            loot.copper *= 6;
        }
        if self.rng.chance(0.6) || kind.elite() {
            let (name, value) = kind.junk();
            loot.items.push(Item::junk(name, value));
        }
        let gear_chance = if kind.elite() { 1.0 } else { 0.16 };
        if self.rng.chance(gear_chance) {
            let rare = kind.elite() || self.rng.chance(0.15);
            loot.items.push(self.roll_gear(level, rare));
        }
        loot
    }

    pub fn roll_gear(&mut self, level: u32, rare: bool) -> Item {
        let slot = *self.rng.pick(&Slot::ALL);
        let rarity = if rare { Rarity::Rare } else { Rarity::Uncommon };
        let q = if rare { 1.5 } else { 1.0 };
        let l = level as f32;
        let (names, power, armor): (&[&str], f32, f32) = match slot {
            Slot::Weapon => (
                &["Hunter's Mace", "Oakwood Staff", "Forged Blade"],
                (1.2 * l + self.rng.range(0.0, 2.0)) * q,
                0.0,
            ),
            Slot::Armor => (
                &["Padded Jerkin", "Wolfhide Vest", "Ironbark Cuirass"],
                0.0,
                (2.6 * l + self.rng.range(0.0, 3.0)) * q,
            ),
            Slot::Charm => (
                &["Bone Charm", "Tin Amulet", "Ember Pendant"],
                (0.6 * l) * q,
                (1.0 * l) * q,
            ),
        };
        let prefix = if rare { "Emberforged" } else { "Sturdy" };
        Item {
            name: format!("{prefix} {}", self.rng.pick(names)),
            rarity,
            slot: Some(slot),
            power: power.round(),
            armor: armor.round(),
            value: ((20.0 + 18.0 * l) * q) as u32,
        }
    }

    fn update_dots(&mut self) {
        let now = self.time;
        let mut ticks: Vec<(usize, f32)> = Vec::new();
        for (i, m) in self.mobs.iter_mut().enumerate() {
            if m.state == MobState::Dead {
                continue;
            }
            for d in m.dots.iter_mut() {
                while d.left > 0 && now >= d.next {
                    d.left -= 1;
                    d.next += d.interval as f64;
                    ticks.push((i, d.dmg));
                }
            }
            m.dots.retain(|d| d.left > 0);
        }
        for (i, dmg) in ticks {
            self.damage_mob(i, dmg, false);
        }
    }

    fn mob_hits_player(&mut self, i: usize) {
        let (level, kind) = (self.mobs[i].level, self.mobs[i].kind);
        let armor = self.player.armor();
        let mitigation = armor / (armor + 40.0 + 12.0 * level as f32);
        let v = self.rng.range(0.85, 1.15);
        let dmg = (mob_damage(level, kind) * v * (1.0 - mitigation)).max(1.0).round();
        self.hurt_player(dmg, kind.name());
    }

    fn hurt_player(&mut self, mut dmg: f32, source: &str) {
        let now = self.time;
        let ppos = self.player.pos;
        if self.player.shield > 0.0 && now < self.player.shield_until {
            let absorbed = dmg.min(self.player.shield);
            self.player.shield -= absorbed;
            dmg -= absorbed;
            if absorbed > 0.0 {
                self.float(ppos, format!("({} absorbed)", absorbed as i32), FloatKind::Info);
            }
        }
        self.player.combat_until = now + COMBAT_TIMEOUT;
        if dmg <= 0.0 {
            return;
        }
        if self.player.cast.is_some() && self.rng.chance(0.35) {
            self.player.cast = None;
            self.push_log("Cast interrupted by damage.", LogKind::Combat);
        }
        self.player.hp -= dmg;
        if self.player.class == Class::Warrior {
            self.player.res = (self.player.res + dmg * 0.35).min(100.0);
        }
        self.float(ppos, format!("-{}", dmg as i32), FloatKind::Taken);
        if self.player.hp <= 0.0 {
            self.player.hp = 0.0;
            self.player.dead = true;
            self.player.target = None;
            self.player.cast = None;
            self.player.auto = false;
            self.push_log(
                format!("You were slain by {source}. Press R to return to Cinderhold."),
                LogKind::Combat,
            );
            self.events.push(Event::PlayerDied);
        }
    }

    fn respawn_player(&mut self) {
        let p = &mut self.player;
        p.dead = false;
        p.pos = SPAWN;
        p.pos.y = terrain::height(p.pos.x, p.pos.z);
        p.hp = (p.max_hp() * 0.5).max(1.0);
        p.res = if p.class.resource() == Resource::Mana {
            p.max_res() * 0.5
        } else {
            0.0
        };
        p.combat_until = 0.0;
        self.push_log("You awaken in Cinderhold.", LogKind::System);
    }

    // ---------------------------------------------------------- progression

    pub fn award_xp(&mut self, amount: u32) {
        if self.player.level >= MAX_LEVEL {
            return;
        }
        self.player.xp += amount;
        while self.player.level < MAX_LEVEL && self.player.xp >= xp_needed(self.player.level) {
            self.player.xp -= xp_needed(self.player.level);
            self.player.level += 1;
            self.player.hp = self.player.max_hp();
            if self.player.class.resource() == Resource::Mana {
                self.player.res = self.player.max_res();
            }
            let lvl = self.player.level;
            self.events.push(Event::LevelUp(lvl));
            self.push_log(format!("You reached level {lvl}!"), LogKind::System);
        }
        if self.player.level >= MAX_LEVEL {
            self.player.xp = 0;
        }
    }

    // --------------------------------------------------------- regeneration

    fn regen(&mut self, dt: f32) {
        if self.player.dead {
            return;
        }
        let now = self.time;
        let ooc = !self.player.in_combat(now);
        let p = &mut self.player;
        let max_hp = p.max_hp();
        if ooc {
            p.hp = (p.hp + max_hp * 0.02 * dt).min(max_hp);
        }
        match p.class.resource() {
            Resource::Rage => {
                if ooc {
                    p.res = (p.res - 3.0 * dt).max(0.0);
                }
            }
            Resource::Mana => {
                let rate = if ooc { 0.035 } else { 0.012 };
                p.res = (p.res + p.max_res() * rate * dt).min(p.max_res());
            }
        }
        if now >= p.shield_until {
            p.shield = 0.0;
        }
    }

    // ----------------------------------------------------------- creatures

    fn aggro_radius(&self, m: &Mob) -> f32 {
        let diff = m.level as f32 - self.player.level as f32;
        let mut r = m.kind.aggro() * (1.0 + 0.04 * diff).clamp(0.5, 1.5);
        if self.player.level >= m.level + 5 {
            r *= 0.3;
        }
        r
    }

    fn update_mobs(&mut self, dt: f32) {
        let now = self.time;
        let ppos = self.player.pos;
        let player_safe = self.player.dead || terrain::in_safe_zone(ppos.x, ppos.z);
        for i in 0..self.mobs.len() {
            let aggro_r = self.aggro_radius(&self.mobs[i]);
            let mut hit = false;
            {
                let m = &mut self.mobs[i];
                m.swing_t = (m.swing_t - dt).max(0.0);
                let speed_mult = if now < m.slowed_until { m.slow_factor } else { 1.0 };
                let rooted = now < m.rooted_until;
                match m.state {
                    MobState::Dead => {
                        if now >= m.respawn_at {
                            m.state = MobState::Idle;
                            m.pos = m.home;
                            m.hp = m.max_hp;
                            m.loot = None;
                            m.dots.clear();
                        }
                    }
                    MobState::Idle => {
                        if !player_safe && flat_dist(ppos, m.pos) < aggro_r {
                            m.state = MobState::Chase;
                            m.wander_to = None;
                            m.attack_at = m.attack_at.max(now + 0.8);
                        } else if let Some(w) = m.wander_to {
                            let to = w - vec2(m.pos.x, m.pos.z);
                            if to.length() < 0.5 {
                                m.wander_to = None;
                            } else {
                                step_mob(m, to, 1.6 * dt);
                            }
                        } else if now >= m.next_wander {
                            let a = (now as f32 * 12.9898 + i as f32 * 78.233).sin() * 43758.545;
                            let ang = (a - a.floor()) * std::f32::consts::TAU;
                            let r = 2.0 + (a * 7.0 - (a * 7.0).floor()) * 5.0;
                            m.wander_to = Some(vec2(m.home.x + ang.cos() * r, m.home.z + ang.sin() * r));
                            m.next_wander = now + 5.0 + (a * 3.0 - (a * 3.0).floor()) as f64 * 5.0;
                        }
                    }
                    MobState::Chase => {
                        let to = vec2(ppos.x - m.pos.x, ppos.z - m.pos.z);
                        let dist = to.length();
                        let home_d = flat_dist(m.pos, m.home);
                        if player_safe || home_d > LEASH {
                            m.state = MobState::Return;
                        } else {
                            m.yaw = to.x.atan2(to.y);
                            let reach = 1.6 + 0.9 * m.kind.scale();
                            if dist > reach {
                                if !rooted {
                                    step_mob(m, to, m.kind.speed() * speed_mult * dt);
                                }
                            } else if now >= m.attack_at {
                                m.attack_at = now + 2.0;
                                m.swing_t = 0.35;
                                hit = true;
                            }
                        }
                    }
                    MobState::Return => {
                        let to = vec2(m.home.x - m.pos.x, m.home.z - m.pos.z);
                        if to.length() < 1.0 {
                            m.state = MobState::Idle;
                            m.hp = m.max_hp;
                            m.dots.clear();
                            m.rooted_until = 0.0;
                            m.slowed_until = 0.0;
                        } else {
                            step_mob(m, to, m.kind.speed() * 1.8 * dt);
                        }
                    }
                }
                m.pos.y = terrain::height(m.pos.x, m.pos.z);
            }
            if hit {
                self.mob_hits_player(i);
            }
        }
    }

    // ---------------------------------------------------------- interaction

    pub fn interact(&mut self) {
        if self.player.dead {
            return;
        }
        let ppos = self.player.pos;
        // corpse loot first
        let corpse = (0..self.mobs.len())
            .filter(|&i| self.mobs[i].state == MobState::Dead && self.mobs[i].loot.is_some())
            .map(|i| (i, flat_dist(ppos, self.mobs[i].pos)))
            .filter(|&(_, d)| d <= LOOT_RANGE)
            .min_by(|a, b| a.1.partial_cmp(&b.1).unwrap());
        if let Some((i, _)) = corpse {
            self.loot_corpse(i);
            return;
        }
        let npc = (0..self.npcs.len())
            .map(|i| (i, flat_dist(ppos, self.npcs[i].pos)))
            .filter(|&(_, d)| d <= INTERACT_RANGE)
            .min_by(|a, b| a.1.partial_cmp(&b.1).unwrap());
        if let Some((i, _)) = npc {
            self.talk(i);
        }
    }

    pub fn nearby_interaction(&self) -> Option<String> {
        if self.player.dead {
            return None;
        }
        let ppos = self.player.pos;
        for m in &self.mobs {
            if m.state == MobState::Dead && m.loot.is_some() && flat_dist(ppos, m.pos) <= LOOT_RANGE {
                return Some(format!("[F] Loot {}", m.kind.name()));
            }
        }
        for n in &self.npcs {
            if flat_dist(ppos, n.pos) <= INTERACT_RANGE {
                return Some(format!("[F] Talk to {}", n.name));
            }
        }
        None
    }

    fn loot_corpse(&mut self, i: usize) {
        let Some(loot) = self.mobs[i].loot.take() else { return };
        self.player.copper += loot.copper;
        if loot.copper > 0 {
            self.push_log(format!("You loot {}.", format_copper(loot.copper)), LogKind::Loot);
        }
        for item in loot.items {
            self.give_item(item);
        }
    }

    pub fn give_item(&mut self, item: Item) {
        if let Some(slot) = item.slot {
            let cur = &self.player.equipment[slot.index()];
            if cur.as_ref().is_none_or(|c| item.score() > c.score()) {
                self.push_log(format!("Equipped {} (upgrade!).", item.name), LogKind::Loot);
                let old = self.player.equipment[slot.index()].replace(item);
                if let Some(old) = old {
                    self.stash(old);
                }
                return;
            }
        }
        self.push_log(format!("You receive {}.", item.name), LogKind::Loot);
        self.stash(item);
    }

    fn stash(&mut self, item: Item) {
        if self.player.inventory.len() >= INVENTORY_SIZE {
            // make room by dropping the cheapest item, so loot is never silently lost
            if let Some(idx) = (0..self.player.inventory.len()).min_by_key(|&k| self.player.inventory[k].value) {
                let old = self.player.inventory.remove(idx);
                self.player.copper += old.value;
                self.push_log(
                    format!("Bag full: {} sold for {}.", old.name, format_copper(old.value)),
                    LogKind::Loot,
                );
            }
        }
        self.player.inventory.push(item);
    }

    fn talk(&mut self, npc: usize) {
        let (name, role) = (self.npcs[npc].name, self.npcs[npc].role);
        match role {
            NpcRole::Vendor => {
                let mut total = 0;
                let mut count = 0;
                self.player.inventory.retain(|it| {
                    if it.rarity == Rarity::Junk {
                        total += it.value;
                        count += 1;
                        false
                    } else {
                        true
                    }
                });
                self.player.copper += total;
                let text = if count > 0 {
                    format!(
                        "Sold {count} junk item(s) for {}. Pleasure doing business!",
                        format_copper(total)
                    )
                } else {
                    "Nothing to sell? Bring me tusks, pelts and anything you can pry off a bandit.".to_string()
                };
                self.events.push(Event::Dialog {
                    speaker: name.into(),
                    text,
                });
            }
            NpcRole::QuestGiver => {
                // 1) turn in
                for q in QUESTS.iter() {
                    if self.quest_state(q) == QuestState::ReadyToTurnIn {
                        self.turn_in(q);
                        return;
                    }
                }
                // 2) accept
                for q in QUESTS.iter() {
                    if self.quest_state(q) == QuestState::Available {
                        self.player.quests.push(QuestProgress { id: q.id, count: 0 });
                        self.events.push(Event::Dialog {
                            speaker: name.into(),
                            text: format!("{}\n\n{}: {} 0/{}", q.intro, q.name, q.objective, q.count),
                        });
                        self.push_log(format!("Quest accepted: {}", q.name), LogKind::Quest);
                        return;
                    }
                }
                let text = if QUESTS.iter().all(|q| self.quest_state(q) == QuestState::Done) {
                    "Cinderhold is safe thanks to you. The vale is yours to roam, hero.".to_string()
                } else {
                    "Still at it? Finish the task I gave you, then come back.".to_string()
                };
                self.events.push(Event::Dialog {
                    speaker: name.into(),
                    text,
                });
            }
        }
    }

    fn turn_in(&mut self, q: &'static QuestDef) {
        self.player.quests.retain(|p| p.id != q.id);
        self.player.done_quests.push(q.id);
        self.player.copper += q.copper;
        self.award_xp(q.xp);
        let mut text = format!("{}\n\nReward: {} XP, {}", q.outro, q.xp, format_copper(q.copper));
        if let Some(make) = q.reward {
            let item = make();
            text.push_str(&format!(", {}", item.name));
            self.give_item(item);
        }
        self.events.push(Event::Dialog {
            speaker: "Warden Maren".into(),
            text,
        });
        self.push_log(format!("Quest complete: {}", q.name), LogKind::Quest);
    }
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum QuestState {
    Locked,
    Available,
    Active,
    ReadyToTurnIn,
    Done,
}

fn step_mob(m: &mut Mob, to: Vec2, dist: f32) {
    if to.length_squared() < 1e-6 {
        return;
    }
    let d = to.normalize() * dist.min(to.length());
    m.pos.x += d.x;
    m.pos.z += d.y;
    m.yaw = to.x.atan2(to.y);
}

pub fn format_copper(c: u32) -> String {
    let (g, s, cu) = (c / 10_000, (c / 100) % 100, c % 100);
    if g > 0 {
        format!("{g}g {s}s {cu}c")
    } else if s > 0 {
        format!("{s}s {cu}c")
    } else {
        format!("{cu}c")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn drive(w: &mut World, secs: f32, input: &Intent) {
        let steps = (secs / 0.016) as usize;
        for _ in 0..steps {
            w.update(0.016, input);
        }
    }

    fn nearest_mob(w: &World, kind: MobKind) -> usize {
        (0..w.mobs.len())
            .filter(|&i| w.mobs[i].kind == kind)
            .min_by(|&a, &b| {
                flat_dist(w.player.pos, w.mobs[a].pos)
                    .partial_cmp(&flat_dist(w.player.pos, w.mobs[b].pos))
                    .unwrap()
            })
            .unwrap()
    }

    fn teleport_next_to(w: &mut World, i: usize, dist: f32) {
        let m = w.mobs[i].pos;
        w.player.pos = vec3(m.x - dist, terrain::height(m.x - dist, m.z), m.z);
    }

    #[test]
    fn world_spawns_expected_population() {
        let w = World::new(Class::Warrior, 1);
        assert_eq!(w.mobs.iter().filter(|m| m.kind == MobKind::Boar).count(), 18);
        assert_eq!(w.mobs.iter().filter(|m| m.kind == MobKind::Gnarlfang).count(), 1);
        assert!(w.mobs.iter().all(|m| !terrain::in_safe_zone(m.pos.x, m.pos.z)));
        assert_eq!(w.npcs.len(), 2);
    }

    #[test]
    fn warrior_kills_boar_and_gains_xp() {
        let mut w = World::new(Class::Warrior, 2);
        let i = nearest_mob(&w, MobKind::Boar);
        w.mobs[i].level = 1;
        w.mobs[i].max_hp = mob_hp(1, MobKind::Boar);
        w.mobs[i].hp = w.mobs[i].max_hp;
        teleport_next_to(&mut w, i, 2.5);
        w.player.target = Some(i);
        w.update(
            0.016,
            &Intent {
                toggle_auto: true,
                ..Default::default()
            },
        );
        drive(&mut w, 20.0, &Intent::default());
        assert_eq!(w.mobs[i].state, MobState::Dead);
        assert!(w.player.xp > 0 || w.player.level > 1);
        assert!(w.mobs[i].loot.is_some());
        assert!(!w.player.dead);
    }

    #[test]
    fn frostbolt_has_cast_time_and_slows() {
        let mut w = World::new(Class::Mage, 3);
        let i = nearest_mob(&w, MobKind::Boar);
        teleport_next_to(&mut w, i, 15.0);
        w.player.target = Some(i);
        let hp0 = w.mobs[i].hp;
        w.update(
            0.016,
            &Intent {
                ability: Some(0),
                ..Default::default()
            },
        );
        assert!(w.player.cast.is_some());
        assert_eq!(w.mobs[i].hp, hp0);
        drive(&mut w, 1.0, &Intent::default());
        assert!(w.player.cast.is_some(), "still casting after 1.0s of a 1.8s cast");
        drive(&mut w, 1.0, &Intent::default());
        assert!(w.player.cast.is_none());
        assert!(w.mobs[i].hp < hp0);
        assert!(w.player.res < w.player.max_res());
    }

    #[test]
    fn moving_interrupts_cast() {
        let mut w = World::new(Class::Mage, 4);
        let i = nearest_mob(&w, MobKind::Boar);
        teleport_next_to(&mut w, i, 15.0);
        w.player.target = Some(i);
        w.update(
            0.016,
            &Intent {
                ability: Some(1),
                ..Default::default()
            },
        );
        assert!(w.player.cast.is_some());
        w.update(
            0.016,
            &Intent {
                move_dir: vec2(1.0, 0.0),
                ..Default::default()
            },
        );
        assert!(w.player.cast.is_none());
    }

    #[test]
    fn cooldown_and_gcd_block_reuse() {
        let mut w = World::new(Class::Mage, 5);
        let before = w.player.pos;
        w.player.yaw = 0.0;
        w.update(
            0.016,
            &Intent {
                ability: Some(3),
                ..Default::default()
            },
        );
        assert!(flat_dist(before, w.player.pos) > 10.0, "blink moved the player");
        let after = w.player.pos;
        w.update(
            0.016,
            &Intent {
                ability: Some(3),
                ..Default::default()
            },
        );
        assert_eq!(after, w.player.pos, "second blink is blocked by cooldown");
        assert!(w.ability_cooldown_left(3) > 10.0);
    }

    #[test]
    fn mob_aggro_chase_and_leash_reset() {
        let mut w = World::new(Class::Warrior, 6);
        let i = nearest_mob(&w, MobKind::Wolf);
        w.mobs[i].level = 4;
        let home = w.mobs[i].home;
        // stand just inside aggro range
        w.player.pos = vec3(home.x - 8.0, terrain::height(home.x - 8.0, home.z), home.z);
        w.update(0.016, &Intent::default());
        assert_eq!(w.mobs[i].state, MobState::Chase);
        // run far away: the wolf gives up and returns home at full health
        w.mobs[i].hp = 1.0;
        w.player.pos = vec3(home.x - 90.0, 0.0, home.z.clamp(-90.0, 90.0));
        drive(&mut w, 25.0, &Intent::default());
        assert!(matches!(w.mobs[i].state, MobState::Return | MobState::Idle));
        drive(&mut w, 15.0, &Intent::default());
        assert_eq!(w.mobs[i].state, MobState::Idle);
        assert_eq!(w.mobs[i].hp, w.mobs[i].max_hp);
    }

    #[test]
    fn safe_zone_stops_aggro() {
        let mut w = World::new(Class::Warrior, 7);
        let i = nearest_mob(&w, MobKind::Boar);
        w.mobs[i].state = MobState::Chase;
        w.player.pos = SPAWN;
        w.update(0.016, &Intent::default());
        assert_eq!(w.mobs[i].state, MobState::Return);
    }

    #[test]
    fn shield_absorbs_damage() {
        let mut w = World::new(Class::Priest, 8);
        w.update(
            0.016,
            &Intent {
                ability: Some(2),
                ..Default::default()
            },
        );
        assert!(w.player.shield > 40.0);
        let hp = w.player.hp;
        w.hurt_player(10.0, "test");
        assert_eq!(w.player.hp, hp);
        assert!(w.player.shield < 100.0);
        w.hurt_player(1000.0, "test");
        assert!(w.player.dead);
    }

    #[test]
    fn death_and_respawn() {
        let mut w = World::new(Class::Warrior, 9);
        w.hurt_player(10_000.0, "test");
        assert!(w.player.dead);
        w.update(
            0.016,
            &Intent {
                respawn: true,
                ..Default::default()
            },
        );
        assert!(!w.player.dead);
        assert!(w.player.hp > 0.0 && w.player.hp < w.player.max_hp());
        assert!(terrain::in_safe_zone(w.player.pos.x, w.player.pos.z));
    }

    #[test]
    fn leveling_and_cap() {
        let mut w = World::new(Class::Warrior, 10);
        w.award_xp(xp_needed(1) + 5);
        assert_eq!(w.player.level, 2);
        assert_eq!(w.player.xp, 5);
        w.award_xp(1_000_000);
        assert_eq!(w.player.level, MAX_LEVEL);
        assert_eq!(w.player.xp, 0);
        assert_eq!(w.player.hp, w.player.max_hp());
    }

    #[test]
    fn full_quest_flow() {
        let mut w = World::new(Class::Warrior, 11);
        // standing at spawn, Warden Maren is within reach
        w.player.pos = vec3(-3.0, 0.0, 0.5);
        w.interact();
        assert_eq!(w.player.quests.len(), 1);
        let marker = w.npc_marker(&w.npcs[0].clone());
        assert_eq!(marker, None, "next quest is still locked, none ready");
        // simulate six boar kills
        for _ in 0..6 {
            let i = (0..w.mobs.len())
                .find(|&i| w.mobs[i].kind == MobKind::Boar && w.mobs[i].state != MobState::Dead)
                .unwrap();
            w.mobs[i].hp = 1.0;
            w.damage_mob(i, 50.0, false);
        }
        assert_eq!(w.player.quest_progress(1).unwrap().count, 6);
        assert_eq!(w.npc_marker(&w.npcs[0].clone()), Some('?'));
        let xp_before = (w.player.level, w.player.xp);
        w.player.pos = vec3(-3.0, 0.0, 0.5);
        w.interact();
        assert!(w.player.done_quests.contains(&1));
        assert!((w.player.level, w.player.xp) > xp_before);
        assert!(
            w.player.equipment[Slot::Armor.index()].is_some(),
            "quest reward auto-equipped"
        );
        assert_eq!(w.npc_marker(&w.npcs[0].clone()), Some('!'), "quest 2 now available");
    }

    #[test]
    fn loot_equip_and_vendor() {
        let mut w = World::new(Class::Warrior, 12);
        let sword = Item {
            name: "Test Blade".into(),
            rarity: Rarity::Uncommon,
            slot: Some(Slot::Weapon),
            power: 5.0,
            armor: 0.0,
            value: 50,
        };
        let worse = Item {
            name: "Stick".into(),
            rarity: Rarity::Common,
            slot: Some(Slot::Weapon),
            power: 1.0,
            armor: 0.0,
            value: 1,
        };
        let base_power = w.player.power();
        w.give_item(sword.clone());
        assert_eq!(w.player.power(), base_power + 5.0);
        w.give_item(worse);
        assert_eq!(w.player.inventory.len(), 1, "worse item goes to the bag");
        w.give_item(Item::junk("Tusk", 10));
        w.player.pos = vec3(6.0, 0.0, -1.0);
        let copper = w.player.copper;
        w.interact();
        assert_eq!(w.player.copper, copper + 10);
        assert!(w.player.inventory.iter().all(|i| i.rarity != Rarity::Junk));
    }

    #[test]
    fn dot_ticks_and_kills() {
        let mut w = World::new(Class::Priest, 13);
        let i = nearest_mob(&w, MobKind::Boar);
        w.mobs[i].hp = 5.0;
        teleport_next_to(&mut w, i, 10.0);
        w.player.target = Some(i);
        w.update(
            0.016,
            &Intent {
                ability: Some(3),
                ..Default::default()
            },
        );
        assert_eq!(w.mobs[i].dots.len(), 1);
        drive(&mut w, 3.0, &Intent::default());
        assert_eq!(w.mobs[i].state, MobState::Dead);
    }

    #[test]
    fn mobs_respawn() {
        let mut w = World::new(Class::Warrior, 14);
        let i = nearest_mob(&w, MobKind::Boar);
        w.damage_mob(i, 10_000.0, false);
        assert_eq!(w.mobs[i].state, MobState::Dead);
        w.player.target = None;
        drive(&mut w, 40.0, &Intent::default());
        assert_eq!(w.mobs[i].state, MobState::Idle);
        assert_eq!(w.mobs[i].hp, w.mobs[i].max_hp);
    }

    #[test]
    fn save_roundtrip() {
        let mut w = World::new(Class::Mage, 15);
        w.award_xp(300);
        w.player.copper = 1234;
        w.give_item(Item::junk("Tusk", 3));
        w.player.quests.push(QuestProgress { id: 1, count: 2 });
        let json = serde_json::to_string(&w.to_save()).unwrap();
        let back: SaveData = serde_json::from_str(&json).unwrap();
        let w2 = World::from_save(back, 99);
        assert_eq!(w2.player.class, Class::Mage);
        assert_eq!(w2.player.level, w.player.level);
        assert_eq!(w2.player.copper, 1234);
        assert_eq!(w2.player.inventory.len(), 1);
        assert_eq!(w2.player.quests, w.player.quests);
    }

    #[test]
    fn tab_targeting_cycles_by_distance() {
        let mut w = World::new(Class::Warrior, 16);
        let i = nearest_mob(&w, MobKind::Boar);
        teleport_next_to(&mut w, i, 5.0);
        w.update(
            0.016,
            &Intent {
                cycle_target: true,
                ..Default::default()
            },
        );
        let first = w.player.target;
        assert!(first.is_some());
        w.update(
            0.016,
            &Intent {
                cycle_target: true,
                ..Default::default()
            },
        );
        assert_ne!(first, w.player.target);
    }

    /// Simple scripted player used to sanity-check class balance.
    fn bot_step(w: &mut World, target: usize) -> Intent {
        let now = w.time;
        let p = &w.player;
        let dist = w.dist_to_mob(target);
        let ready = |i: usize| now >= p.cd[i] && now >= p.gcd_end && p.res >= p.class.abilities()[i].cost;
        let mut it = Intent::default();
        if p.cast.is_some() {
            return it;
        }
        match p.class {
            Class::Warrior => {
                if p.hp < p.max_hp() * 0.4 && ready(3) {
                    it.ability = Some(3);
                } else if dist > 6.0 && ready(1) {
                    it.ability = Some(1);
                } else if dist > 3.0 {
                    let m = w.mobs[target].pos;
                    it.move_dir = vec2(m.x - p.pos.x, m.z - p.pos.z);
                } else if w.mobs[target].dots.is_empty() && ready(2) {
                    it.ability = Some(2);
                } else if ready(0) {
                    it.ability = Some(0);
                }
            }
            Class::Mage => {
                if dist < 5.0 && ready(2) {
                    it.ability = Some(2);
                } else if ready(0) && w.mobs[target].slow_factor == 1.0 {
                    it.ability = Some(0);
                } else if ready(1) {
                    it.ability = Some(1);
                } else if ready(0) {
                    it.ability = Some(0);
                }
            }
            Class::Priest => {
                if p.hp < p.max_hp() * 0.5 && ready(1) {
                    it.ability = Some(1);
                } else if p.shield <= 0.0 && ready(2) {
                    it.ability = Some(2);
                } else if w.mobs[target].dots.is_empty() && ready(3) {
                    it.ability = Some(3);
                } else if ready(0) {
                    it.ability = Some(0);
                }
            }
        }
        it
    }

    /// Returns (won, hp fraction left, seconds).
    fn bot_fight(class: Class, level: u32, kind: MobKind, seed: u64) -> (bool, f32, f32) {
        let mut w = World::new(class, seed);
        w.award_xp(1_000_000);
        w.player.level = level;
        w.player.hp = w.player.max_hp();
        w.player.res = if class == Class::Warrior {
            0.0
        } else {
            w.player.max_res()
        };
        w.player.xp = 0;
        let i = nearest_mob(&w, kind);
        for (j, other) in w.mobs.iter_mut().enumerate() {
            if j != i {
                other.state = MobState::Dead; // isolate the duel: no pulls from neighbouring mobs
                other.respawn_at = f64::MAX;
            }
        }
        w.mobs[i].level = level;
        w.mobs[i].max_hp = mob_hp(level, kind);
        w.mobs[i].hp = w.mobs[i].max_hp;
        let m = w.mobs[i].pos;
        w.player.pos = vec3(m.x - 14.0, terrain::height(m.x - 14.0, m.z), m.z);
        w.player.target = Some(i);
        w.player.auto = true;
        w.player.yaw = (m.x - w.player.pos.x).atan2(m.z - w.player.pos.z);
        w.mobs[i].state = MobState::Chase;
        for _ in 0..(90.0 / 0.05) as usize {
            let intent = bot_step(&mut w, i);
            w.update(0.05, &intent);
            w.events.clear();
            if w.player.dead || w.mobs[i].state == MobState::Dead {
                break;
            }
        }
        if std::env::var("BOT_DEBUG").is_ok() {
            println!(
                "  end: dead={} mob_hp={:.0}/{:.0} state={:?} res={:.0} t={:.1}",
                w.player.dead, w.mobs[i].hp, w.mobs[i].max_hp, w.mobs[i].state, w.player.res, w.time
            );
        }
        (
            w.mobs[i].state == MobState::Dead,
            w.player.hp / w.player.max_hp(),
            w.time as f32,
        )
    }

    #[test]
    fn balance_matched_level_fights_are_winnable_but_not_free() {
        for &(kind, level) in &[
            (MobKind::Boar, 1),
            (MobKind::Boar, 3),
            (MobKind::Wolf, 4),
            (MobKind::Bandit, 6),
            (MobKind::Gnarlfang, 8),
        ] {
            for class in Class::ALL {
                let mut wins = 0;
                let mut hp = 0.0;
                let mut t = 0.0;
                for seed in 0..20 {
                    let (won, h, secs) = bot_fight(class, level, kind, 100 + seed);
                    if won {
                        wins += 1;
                        hp += h;
                        t += secs;
                    }
                }
                let n = wins.max(1) as f32;
                println!(
                    "{:?} L{} vs {:?}: wins {}/20, avg hp left {:.0}%, avg {:.1}s",
                    class,
                    level,
                    kind,
                    wins,
                    hp / n * 100.0,
                    t / n
                );
                if kind != MobKind::Gnarlfang {
                    assert!(
                        wins >= 18,
                        "{class:?} L{level} should beat a matched {kind:?} (won {wins}/20)"
                    );
                    if class == Class::Warrior && level >= 4 {
                        assert!(hp / n < 0.97, "{class:?} L{level} vs {kind:?} is trivially easy");
                    }
                }
            }
        }
    }

    #[test]
    fn copper_formatting() {
        assert_eq!(format_copper(5), "5c");
        assert_eq!(format_copper(250), "2s 50c");
        assert_eq!(format_copper(12_345), "1g 23s 45c");
    }
}
