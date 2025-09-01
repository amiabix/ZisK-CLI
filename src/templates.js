/**
 * Project Templates and Setup
 * Handles project initialization and template generation
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

/**
 * Create project structure
 */
async function createProjectStructure(targetDir, projectType, projectName) {
  const structure = getProjectStructure(projectType);
  
  for (const [dirPath, description] of Object.entries(structure.directories)) {
    const fullPath = path.join(targetDir, dirPath);
    await fs.ensureDir(fullPath);
    console.log(`Created directory: ${dirPath} (${description})`);
  }
}

/**
 * Generate template files
 */
async function generateTemplateFiles(targetDir, projectType, projectName) {
  const templates = getProjectTemplates(projectType, projectName);
  
  for (const [filePath, content] of Object.entries(templates)) {
    const fullPath = path.join(targetDir, filePath);
    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, content, 'utf8');
    console.log(`Created file: ${filePath}`);
  }
}

/**
 * Create configuration
 */
async function createConfiguration(targetDir, options) {
  const config = getDefaultConfiguration(options);
  const configPath = path.join(targetDir, 'zisk-dev.config.js');
  
  const configContent = `module.exports = ${JSON.stringify(config, null, 2)};`;
  await fs.writeFile(configPath, configContent, 'utf8');
  
  console.log(`Created configuration: zisk-dev.config.js`);
}

/**
 * Get project structure for different types
 */
function getProjectStructure(projectType) {
  const baseStructure = {
    directories: {
      'programs/zisk/src': 'ZISK program source code',
      'programs/zisk/tests': 'ZISK program tests',
      'inputs': 'Input files (JSON, YAML, binary)',
      'outputs': 'Generated outputs and proofs',
      'build': 'Build artifacts (gitignored)',
      'docs': 'Project documentation',
      'scripts': 'Utility scripts'
    }
  };

  switch (projectType) {
    case 'advanced':
      return {
        directories: {
          ...baseStructure.directories,
          'programs/zisk/benches': 'Benchmark tests',
          'programs/zisk/examples': 'Example programs',
          'deploy': 'Deployment configurations',
          'ci': 'CI/CD configurations'
        }
      };
    
    case 'custom':
      return {
        directories: {
          ...baseStructure.directories,
          'custom': 'Custom components',
          'config': 'Custom configurations'
        }
      };
    
    default:
      return baseStructure;
  }
}

/**
 * Get project templates
 */
function getProjectTemplates(projectType, projectName) {
  const templates = {
    // Basic Rust program template
    'programs/zisk/src/main.rs': getMainRsTemplate(),
    'programs/zisk/Cargo.toml': getCargoTomlTemplate(projectName),
    'programs/zisk/build.rs': getBuildRsTemplate(),
    
    // Input examples
    'inputs/example.json': getExampleJsonTemplate(),
    'inputs/example.yaml': getExampleYamlTemplate(),
    'inputs/test-case.bin': getExampleBinaryTemplate(),
    
    // Documentation
    'README.md': getReadmeTemplate(projectName),
    'docs/getting-started.md': getGettingStartedTemplate(),
    
    // Configuration files
    '.gitignore': getGitignoreTemplate(),
    '.zisk-build/.gitkeep': '',
    
    // Scripts
    'scripts/setup.sh': getSetupScriptTemplate(),
    'scripts/test.sh': getTestScriptTemplate()
  };

  if (projectType === 'advanced') {
    Object.assign(templates, {
      'programs/zisk/benches/benchmark.rs': getBenchmarkTemplate(),
      'programs/zisk/examples/simple.rs': getSimpleExampleTemplate(),
      'deploy/docker-compose.yml': getDockerComposeTemplate(),
      'ci/github-workflow.yml': getGithubWorkflowTemplate()
    });
  }

  return templates;
}

/**
 * Get default configuration
 */
function getDefaultConfiguration(options) {
  return {
    project: {
      name: options.name || 'zisk-project',
      version: '1.0.0',
      zkvm: 'zisk'
    },
    inputs: {
      directory: './inputs',
      formats: {
        '.json': 'json-serializer',
        '.yaml': 'yaml-serializer',
        '.yml': 'yaml-serializer',
        '.txt': 'text-serializer',
        '.bin': 'passthrough'
      },
      defaultInput: 'example.json'
    },
    outputs: {
      directory: './outputs',
      organize: true,
      keepLogs: true,
      compression: false
    },
    build: {
      profile: 'release',
      features: [],
      target: 'riscv64ima-zisk-zkvm-elf',
      useExistingBuildScript: true
    },
    zisk: {
      provingKey: null,
      witnessLibrary: null,
      executionMode: 'auto',
      parallelism: 'auto',
      memoryLimit: null,
      chunkSizeBits: null,
      unlockMappedMemory: false,
      saveProofs: true,
      verifyProofs: false
    },
    development: {
      watch: {
        enabled: false,
        patterns: ['programs/**/*.rs', 'inputs/**/*'],
        debounce: 1000
      },
      debug: {
        enabled: false,
        level: 1,
        categories: [],
        keepTempFiles: false
      }
    }
  };
}

/**
 * Template content generators
 */
function getMainRsTemplate() {
  return `// This example program takes a number \`n\` as input and computes the SHA-256 hash \`n\` times sequentially.

// Mark the main function as the entry point for ZISK
#![no_main]
ziskos::entrypoint!(main);

use sha2::{Digest, Sha256};
use std::convert::TryInto;
use ziskos::{read_input, set_output};
use byteorder::ByteOrder;

fn main() {
    // Read the input data as a byte array from ziskos
    let input: Vec<u8> = read_input();

    // Get the 'n' value converting the input byte array into a u64 value
    let n: u64 = u64::from_le_bytes(input.try_into().unwrap());

    let mut hash = [0u8; 32];

    // Compute SHA-256 hashing 'n' times
    for _ in 0..n {
        let mut hasher = Sha256::new();
        hasher.update(hash);
        let digest = &hasher.finalize();
        hash = Into::<[u8; 32]>::into(*digest);
    }

    // Split 'hash' value into chunks of 32 bits and write them to ziskos output
    for i in 0..8 {
        let val = byteorder::BigEndian::read_u32(&mut hash[i * 4..i * 4 + 4]);
        set_output(i, val);
    }
}
`;
}

function getCargoTomlTemplate(projectName) {
  return `[package]
name = "${projectName}"
version = "0.1.0"
edition = "2021"
default-run = "${projectName}"

[dependencies]
byteorder = "1.5.0"
sha2 = "0.10.8"
ziskos = { git = "https://github.com/0xPolygonHermez/zisk.git" }

[dev-dependencies]
criterion = "0.5"

[[bench]]
name = "benchmark"
harness = false
`;
}

function getBuildRsTemplate() {
  return `use std::env;
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
`;
}

function getExampleJsonTemplate() {
  return `{
  "n": 1000,
  "description": "Example input for SHA-256 hashing",
  "metadata": {
    "version": "1.0",
    "created": "2024-01-01T00:00:00Z"
  }
}
`;
}

function getExampleYamlTemplate() {
  return `# Example YAML input for ZISK program
n: 1000
description: "Example input for SHA-256 hashing"
metadata:
  version: "1.0"
  created: "2024-01-01T00:00:00Z"
  tags:
    - "example"
    - "sha256"
    - "hashing"
`;
}

function getExampleBinaryTemplate() {
  // Return a simple binary template (8 bytes representing u64 value 1000)
  return Buffer.from([0xe8, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
}

function getReadmeTemplate(projectName) {
  return `# ${projectName}

A ZISK zkVM program for zero-knowledge proof generation.

## Quick Start

1. **Install ZISK dependencies:**
   \`\`\`bash
   zisk-dev install
   \`\`\`

2. **Build the program:**
   \`\`\`bash
   zisk-dev build
   \`\`\`

3. **Run the complete pipeline:**
   \`\`\`bash
   zisk-dev run
   \`\`\`

## Project Structure

\`\`\`
${projectName}/
├── programs/zisk/          # ZISK program source code
│   ├── src/main.rs         # Main program entry point
│   ├── Cargo.toml          # Rust project configuration
│   └── build.rs            # Build script
├── inputs/                  # Input files (JSON, YAML, binary)
├── outputs/                 # Generated outputs and proofs
├── build/                   # Build artifacts
├── docs/                    # Documentation
└── zisk-dev.config.js       # CLI tool configuration
\`\`\`

## Development

- **Watch for changes:** \`zisk-dev watch\`
- **Development mode:** \`zisk-dev dev\`
- **Run tests:** \`zisk-dev test\`
- **System diagnostics:** \`zisk-dev doctor\`

## Configuration

Edit \`zisk-dev.config.js\` to customize:
- Input/output directories
- Build settings
- ZISK-specific options
- Development preferences

## Documentation

See the \`docs/\` directory for detailed documentation.

## License

MIT License
`;
}

function getGettingStartedTemplate() {
  return `# Getting Started with ZISK

This guide will help you get started with developing ZISK zkVM programs.

## Prerequisites

- Node.js 16+ and npm
- Rust toolchain
- ZISK CLI tool (\`zisk-dev\`)

## Installation

1. Install the ZISK CLI tool:
   \`\`\`bash
   npm install -g zisk-dev
   \`\`\`

2. Install ZISK dependencies:
   \`\`\`bash
   zisk-dev install
   \`\`\`

## Your First Program

The template includes a simple SHA-256 hashing program that demonstrates:
- Reading input data
- Processing data in the zkVM
- Generating outputs
- Creating zero-knowledge proofs

## Understanding the Code

### Main Program (\`src/main.rs\`)

\`\`\`rust
#![no_main]
ziskos::entrypoint!(main);

use ziskos::{read_input, set_output};

fn main() {
    let input: Vec<u8> = read_input();
    // Process input...
    set_output(0, result);
}
\`\`\`

### Input Formats

Supported input formats:
- **JSON**: \`{"n": 1000}\`
- **YAML**: \`n: 1000\`
- **Binary**: Raw bytes
- **Text**: Plain text files

### Output

The program generates:
- Execution results
- Zero-knowledge proofs
- Performance metrics

## Next Steps

1. Modify the program in \`src/main.rs\`
2. Add your input data to \`inputs/\`
3. Run \`zisk-dev run\` to test
4. Check \`outputs/\` for results

## Troubleshooting

Run \`zisk-dev doctor\` to diagnose issues.

For more help, see the ZISK documentation.
`;
}

function getGitignoreTemplate() {
  return `# ZISK build artifacts
.zisk-build/
target/
build/

# Output files
outputs/
proofs/

# Logs
*.log
logs/

# Node modules
node_modules/

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Temporary files
*.tmp
*.temp
`;
}

function getSetupScriptTemplate() {
  return `#!/bin/bash

# Setup script for ZISK project

echo "Setting up ZISK development environment..."

# Install ZISK dependencies
zisk-dev install

# Verify installation
zisk-dev doctor

# Build project
zisk-dev build

echo "Setup completed successfully!"
`;
}

function getTestScriptTemplate() {
  return `#!/bin/bash

# Test script for ZISK project

echo "Running ZISK tests..."

# Run all tests
zisk-dev test

# Run specific test types
# zisk-dev test --unit
# zisk-dev test --integration
# zisk-dev test --e2e

echo "Tests completed!"
`;
}

function getBenchmarkTemplate() {
  return `use criterion::{black_box, criterion_group, criterion_main, Criterion};
use zisk_project::main;

fn benchmark_main(c: &mut Criterion) {
    c.bench_function("sha256_hash", |b| {
        b.iter(|| {
            let input = black_box(vec![0xe8, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
            main(input);
        });
    });
}

criterion_group!(benches, benchmark_main);
criterion_main!(benches);
`;
}

function getSimpleExampleTemplate() {
  return `// Simple example: add two numbers
#![no_main]
ziskos::entrypoint!(main);

use ziskos::{read_input, set_output};

fn main() {
    let input: Vec<u8> = read_input();
    
    // Parse two u32 numbers from input
    let a = u32::from_le_bytes([input[0], input[1], input[2], input[3]]);
    let b = u32::from_le_bytes([input[4], input[5], input[6], input[7]]);
    
    // Add the numbers
    let result = a + b;
    
    // Output the result
    set_output(0, result);
}
`;
}

function getDockerComposeTemplate() {
  return `version: '3.8'

services:
  zisk-dev:
    build: .
    volumes:
      - .:/workspace
    working_dir: /workspace
    environment:
      - ZISK_DEV_DEBUG=true
    command: zisk-dev run
`;
}

function getGithubWorkflowTemplate() {
  return `name: ZISK CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install ZISK CLI
      run: npm install -g zisk-dev
    
    - name: Install ZISK dependencies
      run: zisk-dev install
    
    - name: Run tests
      run: zisk-dev test
    
    - name: Build project
      run: zisk-dev build
`;
}

/**
 * Display getting started information
 */
function displayGettingStarted(targetDir, projectName) {
  console.log(`
Project "${projectName}" initialized successfully!

Next steps:
  1. Install ZISK dependencies:
     $ zisk-dev install
     
  2. Build your program:
     $ zisk-dev build
     
  3. Run your first ZISK program:
     $ zisk-dev run
     
  4. Check the outputs:
     $ ls outputs/
     
Development commands:
  $ zisk-dev watch     # Watch for file changes
  $ zisk-dev dev       # Development mode
  $ zisk-dev test      # Run tests
  $ zisk-dev doctor    # System diagnostics

Documentation:
  - README.md
  - docs/getting-started.md

For help: zisk-dev --help
`);
}

module.exports = {
  createProjectStructure,
  generateTemplateFiles,
  createConfiguration,
  displayGettingStarted
};
