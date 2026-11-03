//! Procedural terrain for the zone "Cinderhold Vale". Pure functions, no graphics.

/// The playable area spans [-HALF, HALF] on both horizontal axes.
pub const HALF: f32 = 100.0;
/// Radius of the village safe zone around the origin.
pub const SAFE_RADIUS: f32 = 19.0;

fn smoothstep(a: f32, b: f32, x: f32) -> f32 {
    let t = ((x - a) / (b - a)).clamp(0.0, 1.0);
    t * t * (3.0 - 2.0 * t)
}

pub fn height(x: f32, z: f32) -> f32 {
    let hills = (x * 0.045).sin() * 2.4
        + (z * 0.037).cos() * 2.2
        + ((x + z) * 0.09).sin() * 1.0
        + (x * 0.13).sin() * (z * 0.11).cos() * 0.5;
    let d = (x * x + z * z).sqrt();
    let flat = smoothstep(12.0, 26.0, d);
    // Ridge walls keep the player inside the vale.
    let edge = (x.abs().max(z.abs()) - (HALF - 22.0)).max(0.0);
    hills * flat + edge * edge * 0.09
}

pub fn clamp_to_world(x: f32, z: f32) -> (f32, f32) {
    let m = HALF - 3.0;
    (x.clamp(-m, m), z.clamp(-m, m))
}

pub fn in_safe_zone(x: f32, z: f32) -> bool {
    x * x + z * z < SAFE_RADIUS * SAFE_RADIUS
}

/// Base ground colour (r,g,b in 0..1) at a point, before shading.
pub fn ground_color(x: f32, z: f32, h: f32) -> [f32; 3] {
    let d = (x * x + z * z).sqrt();
    let noise = ((x * 0.7).sin() * (z * 0.6).cos()) * 0.04;
    if d < 14.0 {
        // trodden village earth
        return [0.55 + noise, 0.47 + noise, 0.34 + noise];
    }
    if x.abs().max(z.abs()) > HALF - 24.0 {
        let t = ((h - 1.0) / 12.0).clamp(0.0, 1.0);
        return [0.42 + 0.2 * t, 0.40 + 0.2 * t, 0.38 + 0.22 * t];
    }
    // bandit camp: bare dirt
    let (cx, cz) = (-58.0, -58.0);
    if (x - cx).powi(2) + (z - cz).powi(2) < 10.0 * 10.0 {
        return [0.45 + noise, 0.36 + noise, 0.26 + noise];
    }
    let g = 0.50 + (h * 0.05).clamp(-0.1, 0.12) + noise;
    [0.24 + noise, g, 0.20 + noise]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn village_is_flat() {
        for &(x, z) in &[(0.0, 0.0), (5.0, -4.0), (-8.0, 7.0)] {
            assert!(height(x, z).abs() < 0.01, "height at ({x},{z}) = {}", height(x, z));
        }
    }

    #[test]
    fn edges_rise_and_clamp_works() {
        assert!(height(HALF - 3.0, 0.0) > 3.0);
        let (x, z) = clamp_to_world(500.0, -500.0);
        assert!(x < HALF && z > -HALF);
    }

    #[test]
    fn safe_zone() {
        assert!(in_safe_zone(0.0, 0.0));
        assert!(!in_safe_zone(30.0, 0.0));
    }
}
