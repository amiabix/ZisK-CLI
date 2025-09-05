#!/usr/bin/env node

/**
 * ZisK Development CLI Tool
 * Main entry point for the zisk-dev command
 */

const { Command } = require('commander');
const chalk = require('chalk');
const { version } = require('../package.json');
const { 
  initCommand, 
  buildCommand, 
  runCommand, 
  executeCommand, 
  proveCommand, 
  verifyCommand, 
  cleanCommand,
  watchCommand,
  devCommand,
  welcomeCommand,
  testCommand,
  doctorCommand,
  statusCommand,
  configCommand,
  logsCommand,
  cacheCommand,
  installCommand,
  setupCommand,
  resetCommand,
  analyticsCommand
} = require('../src/commands');
// Simple platform check
const os = require('os');
const platform = os.platform();
const arch = os.arch();

if (!['linux', 'darwin'].includes(platform)) {
  console.error(chalk.red('ERROR: ZisK CLI is not supported on this platform'));
  console.error(chalk.yellow(`Platform: ${platform} ${arch}`));
  console.error(chalk.yellow('Supported platforms: Linux (x64), macOS (x64, arm64)'));
  process.exit(1);
}

// Create CLI program
const program = new Command();

program
  .name('zisk-dev')
  .description('Personal CLI tool for ZISK zkVM development testing and learning purposes')
  .version(version, '-v, --version')
  .option('-d, --debug', 'Enable debug mode')
  .option('--verbose', 'Enable verbose output')
  .option('--config <path>', 'Path to configuration file');

// Core commands
program
  .command('init [name]')
  .description('Initialize a new ZISK project')
  .option('-t, --type <type>', 'Project type (basic, advanced, custom)', 'basic')
  .option('--name <name>', 'Project name (alternative to positional argument)')
  .option('--template <template>', 'Template to use')
  .action(initCommand);

program
  .command('welcome')
  .description('Show welcome message and sleepy cat animation')
  .action(welcomeCommand);

program
  .command('build')
  .description('Build ZISK program')
  .option('--profile <profile>', 'Build profile (debug, release)', 'release')
  .option('--features <features>', 'Cargo features to enable')
  .option('--target <target>', 'Target architecture')
  .option('--release', 'Build in release mode')
  .action(buildCommand);

program
  .command('run')
  .description('Run complete ZISK pipeline')
  .option('-i, --input <path>', 'Input file path')
  .option('--inputs <glob>', 'Input file glob pattern')
  .option('--parallel', 'Run inputs in parallel')
  .option('--skip-prove', 'Skip proof generation')
  .option('--skip-verify', 'Skip proof verification')
  .option('--skip-setup', 'Skip ROM setup')
  .option('--max-steps <number>', 'Maximum execution steps')
  .option('--metrics', 'Show execution metrics')
  .option('--stats', 'Show execution statistics')
  .action(runCommand);

program
  .command('execute')
  .description('Execute ZISK program with input (no proving)')
  .option('-i, --input <path>', 'Input file path')
  .option('--inputs <glob>', 'Input file glob pattern')
  .option('--parallel', 'Run inputs in parallel')
  .option('--metrics', 'Show execution metrics')
  .option('--stats', 'Show execution statistics')
  .option('--max-steps <number>', 'Maximum execution steps')
  .option('--profile <profile>', 'Build profile (debug, release)', 'release')
  .action(executeCommand);

program
  .command('prove')
  .description('Generate zero-knowledge proof')
  .option('-i, --input <path>', 'Input file path')
  .option('--inputs <glob>', 'Input file glob pattern')
  .option('--parallel', 'Run inputs in parallel')
  .option('--verify', 'Verify proof after generation')
  .option('--output <path>', 'Output directory for proofs')
  .option('--aggregate', 'Generate aggregated proof')
  .option('--profile <profile>', 'Build profile (debug, release)', 'release')
  .option('--proving-key <path>', 'Path to proving key')
  .option('--witness <path>', 'Path to witness library')
  .action(proveCommand);

program
  .command('verify')
  .description('Verify a generated proof')
  .option('-p, --proof <path>', 'Proof file path')
  .option('--proofs <glob>', 'Proof file glob pattern')
  .option('--parallel', 'Verify proofs in parallel')
  .option('--starkinfo <path>', 'Path to STARK info file')
  .option('--verifier <path>', 'Path to verifier binary')
  .option('--verkey <path>', 'Path to verification key')
  .action(verifyCommand);

// Clean command will be defined later with enhanced options

// Development commands
program
  .command('watch')
  .description('Watch for file changes and auto-rebuild')
  .option('--patterns <patterns>', 'File patterns to watch')
  .option('--debounce <ms>', 'Debounce time in milliseconds', '1000')
  .option('--on-change <command>', 'Command to run on file change')
  .action(watchCommand);

program
  .command('dev')
  .description('Development mode with hot reloading')
  .option('--port <port>', 'Development server port', '3000')
  .option('--host <host>', 'Development server host', 'localhost')
  .action(devCommand);

program
  .command('test')
  .description('Run project test suite')
  .option('--unit', 'Run unit tests only')
  .option('--integration', 'Run integration tests only')
  .option('--e2e', 'Run end-to-end tests only')
  .option('--coverage', 'Generate coverage report')
  .action(testCommand);

// Tooling commands (doctor and status defined later with enhanced options)

program
  .command('config')
  .description('Manage configuration')
  .option('--get <key>', 'Get configuration value')
  .option('--set <key> <value>', 'Set configuration value')
  .option('--reset', 'Reset to default configuration')
  .option('--edit', 'Edit configuration file')
  .action(configCommand);

program
  .command('logs')
  .description('View and manage logs')
  .option('--follow', 'Follow log output')
  .option('--lines <number>', 'Number of lines to show', '50')
  .option('--level <level>', 'Log level filter')
  .option('--clear', 'Clear log files')
  .action(logsCommand);

program
  .command('cache')
  .description('Manage cache and temporary files')
  .option('--clear', 'Clear all cache')
  .option('--info', 'Show cache information')
  .option('--cleanup', 'Clean up old cache files')
  .action(cacheCommand);

// Setup commands
program
  .command('install')
  .description('Install or update ZISK dependencies')
  .option('--force', 'Force reinstallation')
  .option('--skip-deps', 'Skip system dependency checks')
  .option('--version <version>', 'Install specific ZISK version')
  .action(installCommand);

program
  .command('setup')
  .description('Run initial setup wizard')
  .option('--interactive', 'Run in interactive mode')
  .option('--auto', 'Run in automatic mode')
  .action(setupCommand);

program
  .command('reset')
  .description('Reset installation or project state')
  .option('--all', 'Reset everything')
  .option('--project', 'Reset project only')
  .option('--config', 'Reset configuration only')
  .action(resetCommand);

// Doctor command
program
  .command('doctor')
  .description('Diagnose ZisK installation and environment')
  .action(doctorCommand);

// Status command
program
  .command('status')
  .description('Show current project status')
  .action(statusCommand);

// Analytics command
program
  .command('analytics')
  .description('Show detailed proof and execution analytics')
  .action(analyticsCommand);

// Clean command (update existing)
program
  .command('clean')
  .description('Clean build artifacts and temporary files')
  .option('--force', 'Force clean without confirmation')
  .option('--all', 'Clean all directories')
  .action(cleanCommand);

// Global error handling
program.exitOverride();

try {
  program.parse();
} catch (error) {
  if (error.code === 'commander.help' || error.code === 'commander.version') {
    process.exit(0);
  }
  
  console.error(chalk.red('Command execution failed:'), error.message);
  process.exit(1);
}
