fn main() {
    let attrs = tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "get_keys",
            "set_keys",
            "reset_keys",
            "toggle_tray",
        ]),
    );

    tauri_build::try_build(attrs).expect("failed to run tauri-build");
}
