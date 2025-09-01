# ZisK Development CLI Tool (Personal Project)

**IMPORTANT: This is a personal project for testing and learning purposes only. It is NOT an official ZisK tool.**

A personal CLI tool for ZisK zkVM development testing and learning purposes. This tool automates basic ZisK workflows for educational and testing purposes only. For production use, please refer to the official ZisK documentation and tools.

## Features

- **Single Command Pipeline**: Convert `zisk-dev run` replaces 6+ manual commands
- **Multi-Format Input Support**: JSON, YAML, text, and binary input formats
- **Cross-Platform**: Full support for Linux, limited support for macOS
- **Developer Experience**: Comprehensive error handling, debugging, and progress tracking
- **Zero Configuration**: Works out-of-the-box with sensible defaults
- **Project Templates**: Quick project initialization with example code
- **Hot Reloading**: Watch mode for development with auto-rebuild
- **System Diagnostics**: Built-in health checks and troubleshooting

## Prerequisites

- **Node.js**: 16.0.0 or later
- **npm**: 8.0.0 or later
- **Platform**: Linux (x64) for full features, macOS (x64/arm64) for limited features
- **System Dependencies**: curl, tar, gcc (automatically checked during installation)

## Installation

```bash
npm install -g zisk-dev
```

The installation includes automatic verification of your system and provides setup guidance.

## Quick Start

### 1. Create a New Project

```bash
# Create and initialize a new ZISK project
mkdir my-zisk-project && cd my-zisk-project
zisk-dev init

# Or with custom options
zisk-dev init --type advanced --name my-custom-project
```

### 2. Install ZISK Dependencies

```bash
# Install ZISK toolchain and dependencies
zisk-dev install
```

### 3. Run Your First Program

```bash
# Execute the complete pipeline following ZisK documentation
zisk-dev run

# Or run individual steps:
zisk-dev build --release                    # Build program
zisk-dev execute -i inputs/example.json     # Execute with input
zisk-dev prove -i inputs/example.json        # Generate proof
zisk-dev verify -p proofs/proof.bin         # Verify proof
```

## Command Reference

### Core Commands

| Command | Description | Example |
|---------|-------------|---------|
| `init` | Initialize new ZISK project | `zisk-dev init --type advanced` |
| `build` | Build ZISK program | `zisk-dev build --profile release` |
| `run` | Complete pipeline execution | `zisk-dev run -i inputs/data.json --metrics` |
| `execute` | Execute program (no proving) | `zisk-dev execute --metrics` |
| `prove` | Generate zero-knowledge proof | `zisk-dev prove --verify` |
| `verify` | Verify generated proof | `zisk-dev verify -p proof.bin` |
| `clean` | Clean build artifacts | `zisk-dev clean --all` |

### Development Commands

| Command | Description | Example |
|---------|-------------|---------|
| `watch` | Watch for file changes | `zisk-dev watch --patterns "**/*.rs"` |
| `dev` | Development mode | `zisk-dev dev --port 3000` |
| `test` | Run test suite | `zisk-dev test --coverage` |

### Tooling Commands

| Command | Description | Example |
|---------|-------------|---------|
| `doctor` | System diagnostics | `zisk-dev doctor --fix` |
| `status` | Project status | `zisk-dev status --detailed` |
| `config` | Manage configuration | `zisk-dev config --get "zisk.executionMode"` |
| `logs` | View logs | `zisk-dev logs --follow` |
| `cache` | Manage cache | `zisk-dev cache --clear` |

### Setup Commands

| Command | Description | Example |
|---------|-------------|---------|
| `install` | Install dependencies | `zisk-dev install --force` |
| `setup` | Setup wizard | `zisk-dev setup --interactive` |
| `reset` | Reset state | `zisk-dev reset --all` |

## Project Structure

```
my-zisk-project/
├── programs/zisk/          # ZISK program source code
│   ├── src/main.rs         # Main program entry point
│   ├── Cargo.toml          # Rust project configuration
│   └── build.rs            # Build script
├── inputs/                  # Input files (JSON, YAML, binary)
│   ├── example.json         # Sample JSON input
│   ├── example.yaml         # Sample YAML input
│   └── test-case.bin        # Sample binary input
├── outputs/                 # Generated outputs and proofs
├── build/                   # Build artifacts (gitignored)
├── docs/                    # Project documentation
├── scripts/                 # Utility scripts
└── zisk-dev.config.js       # CLI tool configuration
```

## Configuration

The CLI tool uses a hierarchical configuration system:

1. **Default configuration** (built-in)
2. **Global configuration** (`~/.zisk/config.json`)
3. **Project configuration** (`zisk-dev.config.js`)
4. **Environment variables** (`ZISK_DEV_*`)
5. **Command-line options**

### Example Configuration

```javascript
// zisk-dev.config.js
module.exports = {
  project: {
    name: 'my-zisk-project',
    version: '1.0.0'
  },
  inputs: {
    directory: './inputs',
    formats: {
      '.json': 'json-serializer',
      '.yaml': 'yaml-serializer'
    }
  },
  outputs: {
    directory: './outputs',
    organize: true
  },
  build: {
    profile: 'release',
    target: 'riscv64ima-zisk-zkvm-elf'
  },
  zisk: {
    executionMode: 'auto',
    parallelism: 'auto',
    saveProofs: true
  },
  development: {
    watch: {
      enabled: false,
      patterns: ['programs/**/*.rs']
    },
    debug: {
      enabled: false,
      level: 1
    }
  }
};
```

## Input Formats

The CLI supports multiple input formats with automatic conversion to ZISK-compatible binary:

### JSON Input
```json
{
  "n": 1000,
  "description": "Example input",
  "metadata": {
    "version": "1.0"
  }
}
```

### YAML Input
```yaml
n: 1000
description: "Example input"
metadata:
  version: "1.0"
```

### Text Input
```
# Lines format
line1
line2
line3

# CSV format
name,value,description
item1,100,first item
item2,200,second item

# Key-value format
key1=value1
key2=value2
```

### Binary Input
Raw binary data (passed through without conversion)

## Advanced Usage

### Parallel Execution

```bash
# Execute multiple inputs in parallel
zisk-dev run --inputs "inputs/*.json" --parallel

# Use MPI for distributed proving
zisk-dev prove --parallel --mpi-processes 4
```

### GPU Acceleration

```bash
# Enable GPU support (Linux x64 only)
zisk-dev build --features gpu
zisk-dev prove --gpu
```

### Custom Input Conversion

```javascript
// Custom converter
module.exports = {
  convert: async (inputPath, options) => {
    // Custom conversion logic
    return Buffer.from(convertedData);
  }
};
```

### Development Workflow

```bash
# Start development mode with hot reloading
zisk-dev dev

# Watch specific files
zisk-dev watch --patterns "src/**/*.rs" "inputs/**/*"

# Run tests with coverage
zisk-dev test --coverage
```

## Troubleshooting

### System Diagnostics

```bash
# Comprehensive system check
zisk-dev doctor

# Detailed diagnostics with fixes
zisk-dev doctor --fix --report
```

### Common Issues

1. **Platform Not Supported**
   ```bash
   # Check platform compatibility
   zisk-dev doctor
   ```

2. **Build Failures**
   ```bash
   # Clean and rebuild
   zisk-dev clean --all
   zisk-dev build
   ```

3. **Memory Issues**
   ```bash
   # Check system resources
   zisk-dev status --detailed
   ```

4. **Network Problems**
   ```bash
   # Verify connectivity
   zisk-dev doctor --check-network
   ```

### Debug Mode

```bash
# Enable debug output
zisk-dev run --debug

# Verbose logging
zisk-dev run --verbose

# Keep temporary files
zisk-dev run --debug --keep-temp-files
```

## Performance

### Optimization Tips

1. **Use Release Builds**: `zisk-dev build --profile release`
2. **Enable Parallelism**: `zisk-dev run --parallel`
3. **GPU Acceleration**: Use GPU support on Linux x64
4. **Memory Management**: Monitor system resources with `zisk-dev status`

### Performance Monitoring

```bash
# Show execution metrics
zisk-dev execute --metrics

# Show detailed statistics
zisk-dev execute --stats

# Monitor performance over time
zisk-dev run --metrics --output-format json
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/0xPolygonHermez/zisk-dev.git
cd zisk-dev

# Install dependencies
npm install

# Run tests
npm test

# Build the CLI
npm run build
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Links

- **Documentation**: [https://0xpolygonhermez.github.io/zisk/](https://0xpolygonhermez.github.io/zisk/)
- **ZISK Repository**: [https://github.com/0xPolygonHermez/zisk](https://github.com/0xPolygonHermez/zisk)
- **Issues**: [https://github.com/0xPolygonHermez/zisk-dev/issues](https://github.com/0xPolygonHermez/zisk-dev/issues)
- **Discussions**: [https://github.com/0xPolygonHermez/zisk-dev/discussions](https://github.com/0xPolygonHermez/zisk-dev/discussions)

## Acknowledgments

- [0xPolygonHermez](https://github.com/0xPolygonHermez) for the ZISK zkVM
- The Rust community for excellent tooling
- All contributors and users of this project

---

**Made with love by the ZISK Development Team**
