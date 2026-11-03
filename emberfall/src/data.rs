//! Static game data: classes, abilities, items, creatures and quests.
//! Everything here is original; nothing is taken from any other game.

use serde::{Deserialize, Serialize};

pub const MAX_LEVEL: u32 = 10;

// ---------------------------------------------------------------- classes

#[derive(Clone, Copy, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub enum Class {
    Warrior,
    Mage,
    Priest,
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Resource {
    Rage,
    Mana,
}

impl Resource {
    pub fn name(self) -> &'static str {
        match self {
            Resource::Rage => "Rage",
            Resource::Mana => "Mana",
        }
    }
}

impl Class {
    pub const ALL: [Class; 3] = [Class::Warrior, Class::Mage, Class::Priest];

    pub fn name(self) -> &'static str {
        match self {
            Class::Warrior => "Emberguard",
            Class::Mage => "Stormcaller",
            Class::Priest => "Lightwarden",
        }
    }

    pub fn blurb(self) -> &'static str {
        match self {
            Class::Warrior => "Armoured frontliner. Builds Rage by fighting; hits hard up close.",
            Class::Mage => "Glass cannon. Ranged bolts, slows and a Nova to stay alive.",
            Class::Priest => "Tough caster. Shields and heals yourself while wearing foes down.",
        }
    }

    pub fn resource(self) -> Resource {
        match self {
            Class::Warrior => Resource::Rage,
            _ => Resource::Mana,
        }
    }

    pub fn base_hp(self) -> f32 {
        match self {
            Class::Warrior => 120.0,
            Class::Mage => 80.0,
            Class::Priest => 92.0,
        }
    }

    pub fn hp_per_level(self) -> f32 {
        match self {
            Class::Warrior => 30.0,
            Class::Mage => 18.0,
            Class::Priest => 22.0,
        }
    }

    pub fn max_resource(self, level: u32) -> f32 {
        match self.resource() {
            Resource::Rage => 100.0,
            Resource::Mana => 100.0 + 22.0 * (level as f32 - 1.0),
        }
    }

    /// (range, damage as a fraction of power, swing interval seconds)
    pub fn auto_attack(self) -> (f32, f32, f32) {
        match self {
            Class::Warrior => (3.5, 0.6, 2.0),
            _ => (24.0, 0.45, 2.6), // wand
        }
    }

    pub fn base_armor(self) -> f32 {
        match self {
            Class::Warrior => 40.0,
            Class::Mage => 5.0,
            Class::Priest => 15.0,
        }
    }

    pub fn color(self) -> [u8; 3] {
        match self {
            Class::Warrior => [190, 60, 40],
            Class::Mage => [70, 110, 220],
            Class::Priest => [230, 220, 170],
        }
    }

    pub fn abilities(self) -> &'static [AbilityDef; 4] {
        match self {
            Class::Warrior => &WARRIOR,
            Class::Mage => &MAGE,
            Class::Priest => &PRIEST,
        }
    }
}

// ------------------------------------------------------------- abilities

#[derive(Clone, Copy, Debug)]
pub enum Effect {
    /// Melee hit for `power * mult`.
    Strike {
        mult: f32,
    },
    /// Ranged hit for `base + power * coef`, optional slow (factor of speed, seconds).
    Spell {
        base: f32,
        coef: f32,
        slow: f32,
        slow_secs: f32,
    },
    Dot {
        per_tick: f32,
        coef: f32,
        ticks: u32,
        interval: f32,
    },
    Heal {
        base: f32,
        coef: f32,
    },
    Shield {
        base: f32,
        coef: f32,
        secs: f32,
    },
    Nova {
        radius: f32,
        base: f32,
        coef: f32,
        root_secs: f32,
    },
    Blink {
        dist: f32,
    },
    Charge {
        mult: f32,
        rage: f32,
    },
}

#[derive(Clone, Copy, Debug)]
pub struct AbilityDef {
    pub name: &'static str,
    pub desc: &'static str,
    pub cost: f32,
    pub cast: f32,
    pub cooldown: f32,
    pub range: f32,
    pub effect: Effect,
}

impl AbilityDef {
    pub fn needs_target(&self) -> bool {
        matches!(
            self.effect,
            Effect::Strike { .. } | Effect::Spell { .. } | Effect::Dot { .. } | Effect::Charge { .. }
        )
    }
}

pub static WARRIOR: [AbilityDef; 4] = [
    AbilityDef {
        name: "Brand Strike",
        desc: "A heavy melee blow.",
        cost: 15.0,
        cast: 0.0,
        cooldown: 0.0,
        range: 3.5,
        effect: Effect::Strike { mult: 2.2 },
    },
    AbilityDef {
        name: "Ember Rush",
        desc: "Rush a distant foe, hit it and gain Rage.",
        cost: 0.0,
        cast: 0.0,
        cooldown: 12.0,
        range: 26.0,
        effect: Effect::Charge { mult: 1.0, rage: 20.0 },
    },
    AbilityDef {
        name: "Rending Cut",
        desc: "Open a wound that bleeds over time.",
        cost: 10.0,
        cast: 0.0,
        cooldown: 0.0,
        range: 3.5,
        effect: Effect::Dot {
            per_tick: 2.0,
            coef: 0.35,
            ticks: 5,
            interval: 2.0,
        },
    },
    AbilityDef {
        name: "Second Wind",
        desc: "Spend Rage to recover health.",
        cost: 30.0,
        cast: 0.0,
        cooldown: 25.0,
        range: 0.0,
        effect: Effect::Heal { base: 50.0, coef: 2.5 },
    },
];

pub static MAGE: [AbilityDef; 4] = [
    AbilityDef {
        name: "Frostbolt",
        desc: "Chilling bolt that slows the target.",
        cost: 20.0,
        cast: 1.8,
        cooldown: 0.0,
        range: 30.0,
        effect: Effect::Spell {
            base: 12.0,
            coef: 1.0,
            slow: 0.5,
            slow_secs: 4.0,
        },
    },
    AbilityDef {
        name: "Cinder Bolt",
        desc: "A slow, powerful bolt of fire.",
        cost: 30.0,
        cast: 2.5,
        cooldown: 0.0,
        range: 30.0,
        effect: Effect::Spell {
            base: 25.0,
            coef: 1.7,
            slow: 0.0,
            slow_secs: 0.0,
        },
    },
    AbilityDef {
        name: "Frost Nova",
        desc: "Freeze nearby enemies in place.",
        cost: 25.0,
        cast: 0.0,
        cooldown: 14.0,
        range: 0.0,
        effect: Effect::Nova {
            radius: 9.0,
            base: 8.0,
            coef: 0.5,
            root_secs: 3.5,
        },
    },
    AbilityDef {
        name: "Blink",
        desc: "Teleport forward.",
        cost: 15.0,
        cast: 0.0,
        cooldown: 12.0,
        range: 0.0,
        effect: Effect::Blink { dist: 14.0 },
    },
];

pub static PRIEST: [AbilityDef; 4] = [
    AbilityDef {
        name: "Smite",
        desc: "Strike a foe with radiant light.",
        cost: 15.0,
        cast: 1.5,
        cooldown: 0.0,
        range: 30.0,
        effect: Effect::Spell {
            base: 10.0,
            coef: 1.0,
            slow: 0.0,
            slow_secs: 0.0,
        },
    },
    AbilityDef {
        name: "Mending Light",
        desc: "Heal yourself.",
        cost: 25.0,
        cast: 1.5,
        cooldown: 0.0,
        range: 0.0,
        effect: Effect::Heal { base: 45.0, coef: 1.6 },
    },
    AbilityDef {
        name: "Warding Halo",
        desc: "Absorb damage for a short time.",
        cost: 20.0,
        cast: 0.0,
        cooldown: 8.0,
        range: 0.0,
        effect: Effect::Shield {
            base: 40.0,
            coef: 1.3,
            secs: 15.0,
        },
    },
    AbilityDef {
        name: "Gloom Touch",
        desc: "Shadow that burns the target over time.",
        cost: 18.0,
        cast: 0.0,
        cooldown: 0.0,
        range: 28.0,
        effect: Effect::Dot {
            per_tick: 3.0,
            coef: 0.45,
            ticks: 6,
            interval: 2.0,
        },
    },
];

// ----------------------------------------------------------------- items

#[derive(Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Debug, Serialize, Deserialize)]
pub enum Rarity {
    Junk,
    Common,
    Uncommon,
    Rare,
}

impl Rarity {
    pub fn color(self) -> [u8; 3] {
        match self {
            Rarity::Junk => [150, 150, 150],
            Rarity::Common => [240, 240, 240],
            Rarity::Uncommon => [90, 220, 90],
            Rarity::Rare => [80, 150, 255],
        }
    }
}

#[derive(Clone, Copy, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub enum Slot {
    Weapon,
    Armor,
    Charm,
}

impl Slot {
    pub const ALL: [Slot; 3] = [Slot::Weapon, Slot::Armor, Slot::Charm];

    pub fn index(self) -> usize {
        match self {
            Slot::Weapon => 0,
            Slot::Armor => 1,
            Slot::Charm => 2,
        }
    }

    pub fn name(self) -> &'static str {
        match self {
            Slot::Weapon => "Weapon",
            Slot::Armor => "Armor",
            Slot::Charm => "Charm",
        }
    }
}

#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub struct Item {
    pub name: String,
    pub rarity: Rarity,
    pub slot: Option<Slot>,
    pub power: f32,
    pub armor: f32,
    /// Vendor value in copper.
    pub value: u32,
}

impl Item {
    pub fn junk(name: &str, value: u32) -> Item {
        Item {
            name: name.to_string(),
            rarity: Rarity::Junk,
            slot: None,
            power: 0.0,
            armor: 0.0,
            value,
        }
    }

    /// Simple comparison score used for auto-equip.
    pub fn score(&self) -> f32 {
        self.power * 2.0 + self.armor
    }
}

// -------------------------------------------------------------- creatures

#[derive(Clone, Copy, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub enum MobKind {
    Boar,
    Wolf,
    Bandit,
    Gnarlfang,
}

impl MobKind {
    pub fn name(self) -> &'static str {
        match self {
            MobKind::Boar => "Thornback Boar",
            MobKind::Wolf => "Ashen Wolf",
            MobKind::Bandit => "Cinder Bandit",
            MobKind::Gnarlfang => "Gnarlfang the Dire",
        }
    }

    pub fn plural(self) -> &'static str {
        match self {
            MobKind::Boar => "Thornback Boars",
            MobKind::Wolf => "Ashen Wolves",
            MobKind::Bandit => "Cinder Bandits",
            MobKind::Gnarlfang => "Gnarlfang",
        }
    }

    pub fn hp_mult(self) -> f32 {
        match self {
            MobKind::Boar => 1.0,
            MobKind::Wolf => 0.9,
            MobKind::Bandit => 1.15,
            MobKind::Gnarlfang => 4.0,
        }
    }

    pub fn dmg_mult(self) -> f32 {
        match self {
            MobKind::Boar => 0.9,
            MobKind::Wolf => 1.1,
            MobKind::Bandit => 1.0,
            MobKind::Gnarlfang => 1.9,
        }
    }

    pub fn speed(self) -> f32 {
        match self {
            MobKind::Boar => 5.2,
            MobKind::Wolf => 6.6,
            MobKind::Bandit => 5.0,
            MobKind::Gnarlfang => 6.0,
        }
    }

    pub fn aggro(self) -> f32 {
        match self {
            MobKind::Boar => 7.0,
            MobKind::Wolf => 14.0,
            MobKind::Bandit => 12.0,
            MobKind::Gnarlfang => 16.0,
        }
    }

    pub fn scale(self) -> f32 {
        match self {
            MobKind::Boar => 0.8,
            MobKind::Wolf => 0.85,
            MobKind::Bandit => 1.0,
            MobKind::Gnarlfang => 1.9,
        }
    }

    pub fn respawn_secs(self) -> f64 {
        match self {
            MobKind::Gnarlfang => 120.0,
            _ => 35.0,
        }
    }

    pub fn elite(self) -> bool {
        self == MobKind::Gnarlfang
    }

    pub fn level_range(self) -> (u32, u32) {
        match self {
            MobKind::Boar => (1, 3),
            MobKind::Wolf => (3, 5),
            MobKind::Bandit => (5, 7),
            MobKind::Gnarlfang => (8, 8),
        }
    }

    pub fn junk(self) -> (&'static str, u32) {
        match self {
            MobKind::Boar => ("Thornback Tusk", 6),
            MobKind::Wolf => ("Ashen Pelt", 14),
            MobKind::Bandit => ("Bent Dagger", 24),
            MobKind::Gnarlfang => ("Dire Fang", 120),
        }
    }
}

// ------------------------------------------------------------ progression

/// XP needed to advance from `level` to `level + 1`.
pub fn xp_needed(level: u32) -> u32 {
    let l = level as f32;
    (60.0 + 40.0 * l + 10.0 * l * l) as u32
}

pub fn mob_hp(level: u32, kind: MobKind) -> f32 {
    ((35.0 + 28.0 * (level as f32 - 1.0)) * kind.hp_mult()).round()
}

/// Average damage of one mob swing before armor.
pub fn mob_damage(level: u32, kind: MobKind) -> f32 {
    (4.0 + 2.7 * (level as f32 - 1.0)) * kind.dmg_mult()
}

/// XP for killing a mob of `mob_level` at `player_level`.
pub fn mob_xp(player_level: u32, mob_level: u32, kind: MobKind) -> u32 {
    if player_level >= MAX_LEVEL {
        return 0;
    }
    let diff = mob_level as i32 - player_level as i32;
    if diff <= -5 {
        return 0;
    }
    let base = 12.0 + 6.0 * mob_level as f32;
    let mult = (1.0 + 0.12 * diff as f32).clamp(0.4, 1.6);
    let elite = if kind.elite() { 3.0 } else { 1.0 };
    (base * mult * elite).round() as u32
}

// ----------------------------------------------------------------- quests

pub struct QuestDef {
    pub id: u32,
    pub name: &'static str,
    pub intro: &'static str,
    pub outro: &'static str,
    pub objective: &'static str,
    pub kind: MobKind,
    pub count: u32,
    pub xp: u32,
    pub copper: u32,
    pub requires: Option<u32>,
    pub reward: Option<fn() -> Item>,
}

fn reward_boar() -> Item {
    Item {
        name: "Warden's Patrol Vest".into(),
        rarity: Rarity::Uncommon,
        slot: Some(Slot::Armor),
        power: 0.0,
        armor: 14.0,
        value: 90,
    }
}
fn reward_wolf() -> Item {
    Item {
        name: "Pelt-Wrapped Cudgel".into(),
        rarity: Rarity::Uncommon,
        slot: Some(Slot::Weapon),
        power: 6.0,
        armor: 0.0,
        value: 140,
    }
}
fn reward_bandit() -> Item {
    Item {
        name: "Emberstone Pendant".into(),
        rarity: Rarity::Rare,
        slot: Some(Slot::Charm),
        power: 7.0,
        armor: 6.0,
        value: 260,
    }
}
fn reward_boss() -> Item {
    Item {
        name: "Fang of the First Frost".into(),
        rarity: Rarity::Rare,
        slot: Some(Slot::Weapon),
        power: 14.0,
        armor: 4.0,
        value: 600,
    }
}

pub const QUESTS: [QuestDef; 4] = [
    QuestDef {
        id: 1,
        name: "Boars at the Gate",
        intro: "Thornback boars are tearing up the fields south of Cinderhold. Cull six of them and the farmers can sleep again.",
        outro: "Good work. Take this vest - it has seen worse boars than these.",
        objective: "Slay Thornback Boars",
        kind: MobKind::Boar,
        count: 6,
        xp: 110,
        copper: 40,
        requires: None,
        reward: Some(reward_boar),
    },
    QuestDef {
        id: 2,
        name: "Ashen Hunters",
        intro: "Ashen wolves grow bold in the eastern pines. Thin their pack - five should break their nerve.",
        outro: "The pines are quieter already. This cudgel is yours.",
        objective: "Slay Ashen Wolves",
        kind: MobKind::Wolf,
        count: 5,
        xp: 220,
        copper: 90,
        requires: Some(1),
        reward: Some(reward_wolf),
    },
    QuestDef {
        id: 3,
        name: "Smoke on the Ridge",
        intro: "Cinder Bandits have raised a camp north-west of here. Break it up - four of them will do.",
        outro: "Their pendants are warm to the touch. Wear this one; you have earned it.",
        objective: "Slay Cinder Bandits",
        kind: MobKind::Bandit,
        count: 4,
        xp: 420,
        copper: 180,
        requires: Some(2),
        reward: Some(reward_bandit),
    },
    QuestDef {
        id: 4,
        name: "The Dire One",
        intro: "Gnarlfang leads the beasts from his den in the north-east. End him, and Cinderhold is safe. Bring a full health bar.",
        outro: "Gnarlfang is dead! Cinderhold will sing of this. Take his fang - and our thanks.",
        objective: "Slay Gnarlfang the Dire",
        kind: MobKind::Gnarlfang,
        count: 1,
        xp: 800,
        copper: 400,
        requires: Some(3),
        reward: Some(reward_boss),
    },
];

pub fn quest(id: u32) -> Option<&'static QuestDef> {
    QUESTS.iter().find(|q| q.id == id)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn xp_curve_increases() {
        for l in 1..MAX_LEVEL {
            assert!(xp_needed(l + 1) > xp_needed(l));
        }
    }

    #[test]
    fn grey_mobs_give_nothing_and_cap_stops_xp() {
        assert_eq!(mob_xp(8, 2, MobKind::Boar), 0);
        assert!(mob_xp(1, 1, MobKind::Boar) > 0);
        assert_eq!(mob_xp(MAX_LEVEL, 10, MobKind::Wolf), 0);
        assert!(mob_xp(5, 8, MobKind::Gnarlfang) > mob_xp(5, 8, MobKind::Bandit));
    }

    #[test]
    fn quests_chain_is_consistent() {
        for q in QUESTS.iter() {
            if let Some(r) = q.requires {
                assert!(quest(r).is_some());
            }
            let item = (q.reward.unwrap())();
            assert!(item.slot.is_some());
        }
    }
}
