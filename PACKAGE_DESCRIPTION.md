# ZisK Development CLI Tool (Personal Project)

**IMPORTANT: This is a personal project for testing and learning purposes only. It is NOT an official ZisK tool.**

A personal CLI tool for ZisK zkVM development testing and learning purposes. This tool automates basic ZisK workflows for educational and testing purposes only. For production use, please refer to the official ZisK documentation and tools.

## Features

### **Core Functionality**
- **Project Scaffolding**: Initialize new ZisK projects with proper structure
- **Build Automation**: Streamlined `cargo-zisk build` process with profile management
- **Execution Pipeline**: Complete workflow from input conversion to proof generation
- **Dependency Management**: Automatic system and ZisK dependency verification
- **Error Handling**: Comprehensive error reporting and recovery suggestions

### **Developer Experience**
- **Cross-Platform Support**: Linux (full), macOS (limited), Windows (not supported)
- **Zero Configuration**: Works out-of-the-box with sensible defaults
- **Progressive Enhancement**: Basic features work everywhere, advanced features on supported platforms
- **Real-time Feedback**: Progress indicators and detailed logging
- **Debug Mode**: Comprehensive debugging and troubleshooting capabilities

### **ZisK Integration**
- **Documentation Compliance**: Follows exact ZisK documentation structure
- **Template Generation**: Creates ZisK-compatible Rust code and configuration
- **Input Conversion**: Supports JSON, YAML, and binary input formats
- **Proof Generation**: Automated zero-knowledge proof creation and verification
- **Performance Metrics**: Execution statistics and performance monitoring

## Installation

```bash
# Install globally
npm install -g @abix/zisk-dev-cli

# Or install locally for development
git clone https://github.com/abix/zisk-dev-cli.git
cd zisk-dev-cli
npm install
npm link
```

## Quick Start

```bash
# Create a new ZisK project
zisk-dev-cli init --name my-zisk-project

# Build your program
zisk-dev-cli build --release

# Run complete pipeline
zisk-dev-cli run -i inputs/example.json --metrics

# Generate proofs
zisk-dev-cli prove -i inputs/example.json --verify

# System diagnostics
zisk-dev-cli doctor
```

## Commands

### **Core Commands**
- `init` - Initialize new ZisK project with templates
- `build` - Build ZisK program with cargo-zisk
- `run` - Execute complete pipeline (convert → build → execute → prove)
- `execute` - Execute program with input (no proving)
- `prove` - Generate zero-knowledge proofs
- `verify` - Verify generated proofs

### **Development Commands**
- `watch` - Watch for file changes and auto-rebuild
- `dev` - Development mode with hot reloading
- `test` - Run project test suite
- `doctor` - System health check and diagnostics

### **Management Commands**
- `status` - Show current project and system status
- `config` - Manage configuration
- `logs` - View and manage logs
- `cache` - Manage cache and temporary files
- `install` - Install or update ZisK dependencies
- `setup` - Run initial setup wizard
- `reset` - Reset installation or project state

## System Requirements

### **Supported Platforms**
- **Linux (x64)**: Full support with ASM runner, MPI, and GPU support
- **macOS (x64/arm64)**: Limited support with emulator mode
- **Windows**: Not supported

### **Dependencies**
- **Node.js**: >= 16.0.0
- **npm**: >= 8.0.0
- **System Tools**: curl, tar, gcc, make
- **ZisK Tools**: cargo-zisk, ziskemu, Rust (installed automatically)

### **Resource Requirements**
- **RAM**: 8GB minimum (16GB+ recommended for proving)
- **Disk**: 10GB free space (setup files are large)
- **Network**: Broadband (multi-GB downloads during setup)
- **CPU**: 4+ cores recommended for parallel proving

## Documentation

- **Official ZisK Documentation**: https://0xpolygonhermez.github.io/zisk/
- **Official Getting Started**: https://0xpolygonhermez.github.io/zisk/getting_started/writing_programs.html
- **This Project Repository**: https://github.com/abix/zisk-dev-cli
- **Official ZisK Repository**: https://github.com/0xPolygonHermez/zisk

## Contributing

This is a personal learning project. For contributions to the official ZisK project, please visit the [official ZisK repository](https://github.com/0xPolygonHermez/zisk).

### **Development Setup**
```bash
git clone https://github.com/abix/zisk-dev-cli.git
cd zisk-dev-cli
npm install
npm test
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

This project is built for learning purposes and references the official ZisK.technology.

**For production use, please use the official ZisK tools and documentation.**

---

**Built by Abix for learning and testing purposes**
