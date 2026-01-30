#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use keyring::Entry;
use tauri_plugin_sql::{Migration, MigrationKind};

const SERVICE_NAME: &str = "MediaPedia";
const OMDB_ACCOUNT: &str = "omdb";
const TMDB_ACCOUNT: &str = "tmdb";
#[tauri::command]
fn get_keys() -> Option<serde_json::Value> {
    let omdb = Entry::new(SERVICE_NAME, OMDB_ACCOUNT).and_then(|entry| entry.get_password());
    let tmdb = Entry::new(SERVICE_NAME, TMDB_ACCOUNT).and_then(|entry| entry.get_password());

    Some(serde_json::json!({
        "omdbKey": omdb.ok(),
        "tmdbKey": tmdb.ok()
    }))
}

#[tauri::command]
fn set_keys(omdbKey: String, tmdbKey: String) -> Result<(), String> {
    Entry::new(SERVICE_NAME, OMDB_ACCOUNT)
        .map_err(|err| err.to_string())?
        .set_password(&omdbKey)
        .map_err(|err| err.to_string())?;

    Entry::new(SERVICE_NAME, TMDB_ACCOUNT)
        .map_err(|err| err.to_string())?
        .set_password(&tmdbKey)
        .map_err(|err| err.to_string())?;

    Ok(())
}

#[tauri::command]
fn reset_keys() -> Result<(), String> {
    let _ = Entry::new(SERVICE_NAME, OMDB_ACCOUNT)
        .map_err(|err| err.to_string())?
        .delete_password();
    let _ = Entry::new(SERVICE_NAME, TMDB_ACCOUNT)
        .map_err(|err| err.to_string())?
        .delete_password();
    Ok(())
}

fn main() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "init",
            sql: include_str!("../migrations/001_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "review scores",
            sql: include_str!("../migrations/002_add_review_scores.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "drop pinned",
            sql: include_str!("../migrations/003_drop_pinned.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_keys, set_keys, reset_keys])
        .plugin(tauri_plugin_sql::Builder::default()
            .add_migrations("sqlite:mediapedia.db", migrations)
            .build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
