#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use keyring::Entry;
use std::sync::Mutex;
use tauri::{CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu};

const SERVICE_NAME: &str = "MediaPedia";
const OMDB_ACCOUNT: &str = "omdb";
const TMDB_ACCOUNT: &str = "tmdb";

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
fn set_keys(omdb_key: String, tmdb_key: String) -> Result<(), String> {
    Entry::new(SERVICE_NAME, OMDB_ACCOUNT)
        .map_err(|err| err.to_string())?
        .set_password(&omdb_key)
        .map_err(|err| err.to_string())?;

    Entry::new(SERVICE_NAME, TMDB_ACCOUNT)
        .map_err(|err| err.to_string())?
        .set_password(&tmdb_key)
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
    let tray_handle = app.tray_handle();
    let next = !*visible;
    tray_handle.set_visible(next).map_err(|err| err.to_string())?;
    *visible = next;
    Ok(next)
}

fn main() {
    let tray_menu = SystemTrayMenu::new()
        .add_item(CustomMenuItem::new("show".to_string(), "Show MediaPedia"))
        .add_item(CustomMenuItem::new("quit".to_string(), "Quit"));
    let system_tray = SystemTray::new().with_menu(tray_menu);

    tauri::Builder::default()
        .manage(TrayState::default())
        .invoke_handler(tauri::generate_handler![get_keys, set_keys, reset_keys, toggle_tray])
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "show" => {
                    if let Some(window) = app.get_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                "quit" => {
                    std::process::exit(0);
                }
                _ => {}
            },
            SystemTrayEvent::LeftClick { .. } => {
                if let Some(window) = app.get_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            _ => {}
        })
        .setup(|app| {
            let tray_state = app.state::<TrayState>();
            if let Ok(mut visible) = tray_state.visible.lock() {
                *visible = false;
            }
            let tray_handle = app.tray_handle();
            let _ = tray_handle.set_visible(false);
            Ok(())
        })
        .plugin(tauri_plugin_sql::Builder::default().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
