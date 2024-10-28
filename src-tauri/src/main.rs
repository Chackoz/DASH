// src-tauri/src/main.rs

use tauri::Manager;
use std::process::Command;
use std::fs;
use std::path::PathBuf;
use tempfile::NamedTempFile;

#[tauri::command]
async fn run_python_code(code: String) -> Result<String, String> {
    // Create a temporary file
    let mut temp_file = NamedTempFile::new()
        .map_err(|e| format!("Failed to create temp file: {}", e))?;
    
    // Write the code to the temporary file
    fs::write(&temp_file, code)
        .map_err(|e| format!("Failed to write code: {}", e))?;
    
    // Run the Python interpreter
    let output = Command::new("python")
        .arg(temp_file.path())
        .output()
        .map_err(|e| format!("Failed to execute Python: {}", e))?;
    
    // Combine stdout and stderr
    let mut result = String::new();
    
    if !output.stdout.is_empty() {
        result.push_str(&String::from_utf8_lossy(&output.stdout));
    }
    
    if !output.stderr.is_empty() {
        result.push_str("\nErrors:\n");
        result.push_str(&String::from_utf8_lossy(&output.stderr));
    }
    
    Ok(result)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![run_python_code])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}