# ZisK Development CLI Tool (Personal Project)

**IMPORTANT: This is a personal project for testing and learning purposes only. It is NOT an official ZisK tool.**

A personal CLI tool for ZisK zkVM development testing and learning purposes. This tool automates basic ZisK workflows for educational and testing purposes only. For production use, please refer to the official ZisK documentation.

## Key Features

- **Project Scaffolding**: Initialize new ZisK projects with proper structure
- **Build Automation**: Streamlined cargo-zisk build process
- **Execution Pipeline**: Complete workflow from input conversion to proof generation
- **Dependency Management**: Automatic system and ZisK dependency verification
- **Cross-Platform**: Linux (full), macOS (limited), Windows (not supported)
- **Zero Configuration**: Works out-of-the-box with sensible defaults

## Quick Start

```bash
# Install globally
npm install -g @abix/zisk-dev-cli

# Create a new project
zisk-dev-cli init --name my-project

# Build and run
zisk-dev-cli build --release
zisk-dev-cli run -i inputs/example.json
```

## Commands

- `init` - Initialize new ZisK project
- `build` - Build ZisK program
- `run` - Execute complete pipeline
- `prove` - Generate zero-knowledge proofs
- `doctor` - System diagnostics

## Important Notes

- This is a personal learning project, not an official ZisK tool
- For production use, refer to official ZisK documentation
- Use at your own risk for testing and educational purposes only

## Requirements

- Node.js >= 16.0.0
- npm >= 8.0.0
- Linux/macOS (Windows not supported)
- 8GB+ RAM recommended

## Documentation

- [Official ZisK Documentation](https://0xpolygonhermez.github.io/zisk/)
- [This Project Repository](https://github.com/abix/zisk-dev-cli)
- [Official ZisK Repository](https://github.com/0xPolygonHermez/zisk)

Built by Abix for learning and testing purposes.
