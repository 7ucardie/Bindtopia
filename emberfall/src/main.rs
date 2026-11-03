use macroquad::prelude::*;

fn window_conf() -> macroquad::conf::Conf {
    macroquad::conf::Conf {
        miniquad_conf: miniquad::conf::Conf {
            window_title: "Emberfall".to_owned(),
            window_width: 1280,
            window_height: 800,
            high_dpi: true,
            sample_count: 4,
            window_resizable: true,
            ..Default::default()
        },
        draw_call_vertex_capacity: 40_000,
        draw_call_index_capacity: 120_000,
        ..Default::default()
    }
}

#[macroquad::main(window_conf)]
async fn main() {
    emberfall::app::run().await;
}
