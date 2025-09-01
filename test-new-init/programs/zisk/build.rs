use std::env;
use std::fs;
use std::path::Path;

fn main() {
    // Tell cargo to rerun this script if input files change
    println!("cargo:rerun-if-changed=inputs/");
    
    // Create build directory if it doesn't exist
    let build_dir = Path::new("build");
    if !build_dir.exists() {
        fs::create_dir(build_dir).unwrap();
    }
}
