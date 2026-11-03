//! Tiny low-poly mesh batcher. macroquad's `draw_cube` cannot rotate, so all
//! world geometry (terrain, props, characters) goes through this builder, which
//! also bakes simple directional shading into vertex colours.

use macroquad::prelude::*;

const MAX_VERTS: usize = 30_000;

pub struct Batch {
    verts: Vec<Vertex>,
    idx: Vec<u16>,
    sealed: Vec<Mesh>,
}

fn light(n: Vec3) -> f32 {
    let l = vec3(0.45, 0.8, 0.35).normalize();
    0.5 + 0.5 * n.normalize_or_zero().dot(l).max(0.0) + 0.06 * n.y.min(0.0)
}

fn shade(c: Color, k: f32) -> Color {
    Color::new((c.r * k).min(1.0), (c.g * k).min(1.0), (c.b * k).min(1.0), c.a)
}

pub fn rgb(r: u8, g: u8, b: u8) -> Color {
    Color::from_rgba(r, g, b, 255)
}

pub fn rotate_y(v: Vec3, yaw: f32) -> Vec3 {
    let (s, c) = yaw.sin_cos();
    vec3(v.x * c + v.z * s, v.y, -v.x * s + v.z * c)
}

impl Batch {
    pub fn new() -> Batch {
        Batch {
            verts: Vec::new(),
            idx: Vec::new(),
            sealed: Vec::new(),
        }
    }

    fn reserve(&mut self, n: usize) {
        if self.verts.len() + n > MAX_VERTS {
            self.seal();
        }
    }

    /// Move the pending geometry into an immutable mesh.
    pub fn seal(&mut self) {
        if self.verts.is_empty() {
            return;
        }
        self.sealed.push(Mesh {
            vertices: std::mem::take(&mut self.verts),
            indices: std::mem::take(&mut self.idx),
            texture: None,
        });
    }

    /// Finish baking and return the meshes (for static geometry).
    pub fn into_meshes(mut self) -> Vec<Mesh> {
        self.seal();
        self.sealed
    }

    /// Draw everything accumulated this frame and reset the batch.
    pub fn draw_and_clear(&mut self) {
        self.seal();
        for m in self.sealed.drain(..) {
            draw_mesh(&m);
        }
    }

    fn vert(&mut self, p: Vec3, c: Color) {
        self.verts.push(Vertex::new2(p, vec2(0.0, 0.0), c));
    }

    /// Flat-shaded triangle.
    pub fn tri(&mut self, a: Vec3, b: Vec3, c: Vec3, col: Color) {
        self.reserve(3);
        let n = (b - a).cross(c - a);
        let col = shade(col, light(n));
        let base = self.verts.len() as u16;
        self.vert(a, col);
        self.vert(b, col);
        self.vert(c, col);
        self.idx.extend_from_slice(&[base, base + 1, base + 2]);
    }

    /// Smooth triangle with per-vertex colours (terrain).
    pub fn tri_smooth(&mut self, v: [(Vec3, Color); 3]) {
        self.reserve(3);
        let base = self.verts.len() as u16;
        for (p, c) in v {
            self.vert(p, c);
        }
        self.idx.extend_from_slice(&[base, base + 1, base + 2]);
    }

    /// Quad given counter-clockwise when seen from outside.
    pub fn quad(&mut self, a: Vec3, b: Vec3, c: Vec3, d: Vec3, col: Color) {
        self.tri(a, b, c, col);
        self.tri(a, c, d, col);
    }

    /// Rotated (about Y) box.
    pub fn cuboid(&mut self, center: Vec3, half: Vec3, yaw: f32, col: Color) {
        let p = |sx: f32, sy: f32, sz: f32| center + rotate_y(vec3(half.x * sx, half.y * sy, half.z * sz), yaw);
        let (a, b, c, d) = (p(-1., -1., -1.), p(1., -1., -1.), p(1., 1., -1.), p(-1., 1., -1.));
        let (e, f, g, h) = (p(-1., -1., 1.), p(1., -1., 1.), p(1., 1., 1.), p(-1., 1., 1.));
        self.quad(e, f, g, h, col); // +z
        self.quad(b, a, d, c, col); // -z
        self.quad(f, b, c, g, col); // +x
        self.quad(a, e, h, d, col); // -x
        self.quad(h, g, c, d, col); // top
        self.quad(a, b, f, e, col); // bottom
    }

    /// Cone / pyramid standing on `base` (centre of the base).
    pub fn cone(&mut self, base: Vec3, radius: f32, height: f32, sides: usize, yaw: f32, col: Color) {
        let tip = base + vec3(0.0, height, 0.0);
        let ring: Vec<Vec3> = (0..sides)
            .map(|i| {
                let a = yaw + i as f32 / sides as f32 * std::f32::consts::TAU;
                base + vec3(a.sin() * radius, 0.0, a.cos() * radius)
            })
            .collect();
        for i in 0..sides {
            let (p, q) = (ring[i], ring[(i + 1) % sides]);
            self.tri(p, q, tip, col);
        }
    }

    /// Low-poly UV sphere.
    pub fn sphere(&mut self, center: Vec3, r: f32, col: Color) {
        const SEG: usize = 8;
        const RINGS: usize = 5;
        let pt = |i: usize, j: usize| {
            let phi = std::f32::consts::PI * j as f32 / RINGS as f32;
            let th = std::f32::consts::TAU * i as f32 / SEG as f32;
            center + vec3(phi.sin() * th.sin(), phi.cos(), phi.sin() * th.cos()) * r
        };
        for j in 0..RINGS {
            for i in 0..SEG {
                let (a, b, c, d) = (pt(i, j), pt(i + 1, j), pt(i + 1, j + 1), pt(i, j + 1));
                // shade by outward normal for a smooth-ish look
                let n = ((a + b + c + d) * 0.25 - center).normalize_or_zero();
                let k = light(n);
                if j > 0 {
                    self.reserve(3);
                    let base = self.verts.len() as u16;
                    self.vert(a, shade(col, k));
                    self.vert(c, shade(col, k));
                    self.vert(b, shade(col, k));
                    self.idx.extend_from_slice(&[base, base + 1, base + 2]);
                }
                if j < RINGS - 1 {
                    self.reserve(3);
                    let base = self.verts.len() as u16;
                    self.vert(a, shade(col, k));
                    self.vert(d, shade(col, k));
                    self.vert(c, shade(col, k));
                    self.idx.extend_from_slice(&[base, base + 1, base + 2]);
                }
            }
        }
    }
}

impl Default for Batch {
    fn default() -> Self {
        Batch::new()
    }
}
