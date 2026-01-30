#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use keyring::Entry;
use std::sync::Mutex;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

const SERVICE_NAME: &str = "MediaPedia";
const OMDB_ACCOUNT: &str = "omdb";
const TMDB_ACCOUNT: &str = "tmdb";
const TRAY_ID: &str = "main";

#[derive(Default)]
struct TrayState {
    visible: Mutex<bool>,
}

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

#[tauri::command]
fn toggle_tray(app: tauri::AppHandle) -> Result<bool, String> {
    let state = app.state::<TrayState>();
    let mut visible = state.visible.lock().map_err(|err| err.to_string())?;
    let tray = app.tray_by_id(TRAY_ID).ok_or("Tray icon not available")?;
    let next = !*visible;
    tray.set_visible(next).map_err(|err| err.to_string())?;
    *visible = next;
    Ok(next)
}

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn main() {
    let migrations = vec![Migration {
        version: 1,
        description: "init",
        sql: include_str!("../migrations/001_init.sql"),
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        .manage(TrayState::default())
        .invoke_handler(tauri::generate_handler![get_keys, set_keys, reset_keys, toggle_tray])
        .setup(|app| {
            let tray_state = app.state::<TrayState>();
            if let Ok(mut visible) = tray_state.visible.lock() {
                *visible = false;
            }

            let show = MenuItem::with_id(app, "show", "Show MediaPedia", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;

            let tray = TrayIconBuilder::with_id(TRAY_ID)
                .menu(&menu)
                .build(app)?;

            tray.on_menu_event(|app, event| match event.id().0.as_str() {
                "show" => show_main_window(app),
                "quit" => app.exit(0),
                _ => {}
            });

            tray.on_tray_icon_event(|tray, event| {
                if let TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                } = event
                {
                    let app = tray.app_handle();
                    show_main_window(&app);
                }
            });

            tray.set_visible(false)?;

            Ok(())
        })
        .plugin(tauri_plugin_sql::Builder::default()
            .add_migrations("sqlite:mediapedia.db", migrations)
            .build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
