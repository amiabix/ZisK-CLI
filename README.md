# ZisK Development CLI

A comprehensive command-line interface for ZisK zkVM development with full macOS support. This tool provides project initialization, building, execution, proof generation, and environment diagnostics for ZisK zero-knowledge virtual machine development.

## Overview

The ZisK Development CLI is a personal development tool designed to streamline ZisK zkVM project workflows. It automates common development tasks including project setup, building, execution, proof generation, and verification while providing comprehensive error handling and environment diagnostics.

**Note**: This is a personal development tool for testing and learning purposes. It is not an official ZisK product.

## Features

- **Project Management**: Initialize new ZisK projects with proper structure
- **Build System**: Compile ZisK programs with configurable profiles and targets
- **Execution Pipeline**: Run programs with input processing and metrics
- **Proof Generation**: Generate zero-knowledge proofs with concurrency control
- **Environment Diagnostics**: Comprehensive system health checks and validation
- **Real-time Monitoring**: Watch mode with automatic rebuilds and execution
- **Error Handling**: Structured error reporting with recovery suggestions
- **Security**: Input validation, path sanitization, and secure process management

## Installation

```bash
npm install -g @abix/zisk-dev-cli
```

## Prerequisites

- Node.js 16.0.0 or higher
- Rust toolchain with cargo-zisk installed
- ZisK zkVM runtime environment

## Quick Start

1. **Initialize a new project**:
   ```bash
   zisk-dev init my-project
   cd my-project
   ```

2. **Build the project**:
   ```bash
   zisk-dev build
   ```

3. **Run the program**:
   ```bash
   zisk-dev run
   ```

4. **Generate proofs**:
   ```bash
   zisk-dev prove
   ```

## Commands

### Project Management

#### `zisk-dev init <name>`
Initialize a new ZisK project with proper structure and configuration.

**Options**:
- `--template <template>`: Use specific project template
- `--features <features>`: Enable specific Rust features

**Example**:
```bash
zisk-dev init my-zk-app --features "std,alloc"
```

#### `zisk-dev status`
Display current project status including build state, configuration, and environment health.

#### `zisk-dev doctor`
Run comprehensive environment diagnostics to identify configuration issues.

### Build and Execution

#### `zisk-dev build`
Build the ZisK program with configurable profiles and targets.

**Options**:
- `--profile <profile>`: Build profile (debug, release)
- `--target <target>`: Target architecture
- `--features <features>`: Enable specific features

**Example**:
```bash
zisk-dev build --profile release --target riscv64ima-zisk-zkvm-elf
```

#### `zisk-dev run`
Execute the built ZisK program with input processing.

**Options**:
- `--input <file>`: Input file path
- `--inputs <pattern>`: Input file pattern (glob)
- `--max-steps <number>`: Maximum execution steps
- `--metrics`: Show execution metrics
- `--stats`: Show execution statistics

**Example**:
```bash
zisk-dev run --input data.json --max-steps 1000000 --metrics
```

#### `zisk-dev execute`
Execute multiple inputs with parallel processing.

**Options**:
- `--parallel`: Run inputs in parallel
- `--max-steps <number>`: Maximum execution steps
- `--metrics`: Show execution metrics

### Proof Generation

#### `zisk-dev prove`
Generate zero-knowledge proofs for program execution.

**Options**:
- `--input <file>`: Input file path
- `--inputs <pattern>`: Input file pattern (glob)
- `--output <dir>`: Output directory for proofs
- `--profile <profile>`: Build profile to use
- `--verify`: Verify generated proofs
- `--aggregate`: Aggregate multiple proofs

**Example**:
```bash
zisk-dev prove --inputs "data/*.json" --output ./proofs --verify
```

#### `zisk-dev verify`
Verify generated proofs.

**Options**:
- `--proof <file>`: Proof file to verify
- `--proofs <pattern>`: Proof file pattern (glob)

### Development Workflow

#### `zisk-dev dev`
Start development mode with automatic rebuilding and execution.

**Options**:
- `--watch`: Watch for file changes
- `--rebuild`: Rebuild on changes
- `--execute`: Execute on changes

#### `zisk-dev watch`
Watch for file changes and trigger rebuilds or execution.

**Options**:
- `--patterns <patterns>`: File patterns to watch
- `--debounce <ms>`: Debounce time in milliseconds
- `--on-change <command>`: Command to run on file change

**Example**:
```bash
zisk-dev watch --patterns "src/**/*.rs" --debounce 1000
```

### Project Management

#### `zisk-dev clean`
Clean build artifacts and temporary files.

**Options**:
- `--all`: Clean all generated files
- `--proofs`: Clean proof files only
- `--build`: Clean build artifacts only

#### `zisk-dev reset`
Reset project to clean state, removing all generated files.

#### `zisk-dev config`
Manage project configuration and environment variables.

**Options**:
- `--set <key=value>`: Set configuration value
- `--get <key>`: Get configuration value
- `--list`: List all configuration values

### Utilities

#### `zisk-dev logs`
View and manage log files.

**Options**:
- `--level <level>`: Log level (error, warn, info, debug)
- `--follow`: Follow log output
- `--clear`: Clear log files

#### `zisk-dev cache`
Manage build and execution cache.

**Options**:
- `--clear`: Clear all cache
- `--status`: Show cache status
- `--size`: Show cache size

#### `zisk-dev analytics`
Analyze project execution and proof generation statistics.

**Options**:
- `--proofs`: Analyze proof generation
- `--execution`: Analyze execution performance
- `--export <file>`: Export analytics data

## Configuration

The CLI uses a `.env` file for project-specific configuration. Key configuration options:

```bash
# Project settings
PROJECT_NAME=my-project
BUILD_PROFILE=release
BUILD_TARGET=riscv64ima-zisk-zkvm-elf

# Execution settings
EXECUTION_MAX_STEPS=1000000
INPUT_DEFAULT_FILE=input.bin

# Output settings
OUTPUT_DIRECTORY=./proofs

# Debug settings
ZISK_DEBUG=1  # Enable debug logging
ZISK_MAX_CONCURRENT=4  # Max concurrent operations
```

## Environment Variables

- `ZISK_DEBUG`: Enable debug logging and verbose output
- `ZISK_MAX_CONCURRENT`: Maximum concurrent operations (default: CPU cores / 2)
- `RUST_LOG`: Rust logging level
- `CARGO_TARGET_DIR`: Cargo target directory

## Security Features

- **Input Validation**: All user inputs are validated and sanitized
- **Path Sanitization**: Prevents directory traversal attacks
- **Process Management**: Secure process execution with timeouts and limits
- **Log Redaction**: Sensitive values are automatically redacted from logs
- **Concurrency Control**: Prevents resource exhaustion through process limits
- **Environment Sanitization**: Only safe environment variables are passed to child processes

## Error Handling

The CLI provides comprehensive error handling with:

- Structured error reporting with context
- Recovery suggestions for common issues
- Automatic cleanup of failed operations
- Detailed logging for debugging

## Platform Support

- **macOS**: Full support including proof generation and verification
- **Linux**: Full support for all features
- **Architectures**: x64 and ARM64

## Troubleshooting

### Common Issues

1. **Build failures**: Check Rust toolchain and cargo-zisk installation
2. **Execution errors**: Verify input file format and program logic
3. **Proof generation issues**: Ensure proper ROM setup and witness generation
4. **Permission errors**: Check file permissions and directory access

### Debug Mode

Enable debug mode for detailed logging:

```bash
export ZISK_DEBUG=1
zisk-dev <command>
```

### Environment Diagnostics

Run comprehensive diagnostics:

```bash
zisk-dev doctor
```

## Contributing

This is a personal development tool. For issues or suggestions, please open an issue on the GitHub repository.

## License

MIT License - see LICENSE file for details.

## Disclaimer

This tool is for educational and development purposes only. It is not affiliated with or endorsed by the official ZisK project. Use at your own risk.