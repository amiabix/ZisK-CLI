# Getting Started with ZISK

This guide will help you get started with developing ZISK zkVM programs.

## Prerequisites

- Node.js 16+ and npm
- Rust toolchain
- ZISK CLI tool (`zisk-dev`)

## Installation

1. Install the ZISK CLI tool:
   ```bash
   npm install -g zisk-dev
   ```

2. Install ZISK dependencies:
   ```bash
   zisk-dev install
   ```

## Your First Program

The template includes a simple SHA-256 hashing program that demonstrates:
- Reading input data
- Processing data in the zkVM
- Generating outputs
- Creating zero-knowledge proofs

## Understanding the Code

### Main Program (`src/main.rs`)

```rust
#![no_main]
ziskos::entrypoint!(main);

use ziskos::{read_input, set_output};

fn main() {
    let input: Vec<u8> = read_input();
    // Process input...
    set_output(0, result);
}
```

### Input Formats

Supported input formats:
- **JSON**: `{"n": 1000}`
- **YAML**: `n: 1000`
- **Binary**: Raw bytes
- **Text**: Plain text files

### Output

The program generates:
- Execution results
- Zero-knowledge proofs
- Performance metrics

## Next Steps

1. Modify the program in `src/main.rs`
2. Add your input data to `inputs/`
3. Run `zisk-dev run` to test
4. Check `outputs/` for results

## Troubleshooting

Run `zisk-dev doctor` to diagnose issues.

For more help, see the ZISK documentation.
