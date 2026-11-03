//! Character persistence: one JSON file in the platform's user-data folder.

use crate::sim::SaveData;
use std::path::{Path, PathBuf};

pub fn save_path() -> Option<PathBuf> {
    if let Some(p) = std::env::var_os("EMBERFALL_SAVE") {
        return Some(PathBuf::from(p));
    }
    #[cfg(target_os = "macos")]
    {
        let home = std::env::var_os("HOME")?;
        Some(PathBuf::from(home).join("Library/Application Support/Emberfall/save.json"))
    }
    #[cfg(target_os = "windows")]
    {
        let dir = std::env::var_os("APPDATA")?;
        Some(PathBuf::from(dir).join("Emberfall").join("save.json"))
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        if let Some(x) = std::env::var_os("XDG_DATA_HOME") {
            return Some(PathBuf::from(x).join("emberfall/save.json"));
        }
        let home = std::env::var_os("HOME")?;
        Some(PathBuf::from(home).join(".local/share/emberfall/save.json"))
    }
}

pub fn load_from(path: &Path) -> Option<SaveData> {
    let text = std::fs::read_to_string(path).ok()?;
    serde_json::from_str(&text).ok()
}

/// Write atomically (temp file + rename) so a crash never corrupts the save.
pub fn store_to(path: &Path, data: &SaveData) -> std::io::Result<()> {
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir)?;
    }
    let tmp = path.with_extension("json.tmp");
    let json = serde_json::to_string_pretty(data).map_err(std::io::Error::other)?;
    std::fs::write(&tmp, json)?;
    std::fs::rename(&tmp, path)
}

pub fn load() -> Option<SaveData> {
    load_from(&save_path()?)
}

pub fn store(data: &SaveData) -> std::io::Result<()> {
    let path = save_path().ok_or_else(|| std::io::Error::other("no save location"))?;
    store_to(&path, data)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::data::Class;
    use crate::sim::World;

    #[test]
    fn store_and_load_roundtrip_and_reject_garbage() {
        let dir = std::env::temp_dir().join(format!("emberfall-test-{}", std::process::id()));
        let path = dir.join("nested/save.json");
        let w = World::new(Class::Priest, 1);
        store_to(&path, &w.to_save()).unwrap();
        let back = load_from(&path).unwrap();
        assert_eq!(back.class, Class::Priest);
        std::fs::write(&path, "not json").unwrap();
        assert!(load_from(&path).is_none());
        assert!(load_from(&dir.join("missing.json")).is_none());
        let _ = std::fs::remove_dir_all(&dir);
    }
}
