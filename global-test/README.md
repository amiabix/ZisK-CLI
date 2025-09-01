# test-project

A ZISK zkVM program for zero-knowledge proof generation.

## Quick Start

1. **Install ZISK dependencies:**
   ```bash
   zisk-dev install
   ```

2. **Build the program:**
   ```bash
   zisk-dev build
   ```

3. **Run the complete pipeline:**
   ```bash
   zisk-dev run
   ```

## Project Structure

```
test-project/
├── programs/zisk/          # ZISK program source code
│   ├── src/main.rs         # Main program entry point
│   ├── Cargo.toml          # Rust project configuration
│   └── build.rs            # Build script
├── inputs/                  # Input files (JSON, YAML, binary)
├── outputs/                 # Generated outputs and proofs
├── build/                   # Build artifacts
├── docs/                    # Documentation
└── zisk-dev.config.js       # CLI tool configuration
```

## Development

- **Watch for changes:** `zisk-dev watch`
- **Development mode:** `zisk-dev dev`
- **Run tests:** `zisk-dev test`
- **System diagnostics:** `zisk-dev doctor`

## Configuration

Edit `zisk-dev.config.js` to customize:
- Input/output directories
- Build settings
- ZISK-specific options
- Development preferences

## Documentation

See the `docs/` directory for detailed documentation.

## License

MIT License
