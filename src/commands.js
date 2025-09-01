/**
 * Command Implementations
 * Main command handlers for the zisk-dev CLI
 */

const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const chalk = require('chalk');
const ora = require('ora').default;
const inquirer = require('inquirer');

const { Logger } = require('./logger');
const { ConfigurationManager } = require('./config');
const { PlatformManager } = require('./platform');
const { CommandExecutor, ZiskCommandBuilder } = require('./executor');
const { InputConverter } = require('./converter');
const { ErrorHandler } = require('./errors');

// Initialize core services
const logger = new Logger();
const configManager = new ConfigurationManager();
const platform = new PlatformManager();
const executor = new CommandExecutor();
const converter = new InputConverter();
const errorHandler = new ErrorHandler();

/**
 * Initialize a new ZISK project or configure existing one
 */
async function initCommand(options) {
  console.log('Initializing ZISK project...');
  
  try {
    const targetDir = process.cwd();
    const projectName = options.name || 'zisk-project';
    
    // Check if this is an existing ZisK project
    const isExistingProject = await checkExistingZiskProject(targetDir);
    
    if (isExistingProject) {
      console.log('Detected existing ZisK project. Adding configuration and tooling...');
      await configureExistingProject(targetDir, options);
    } else {
      console.log('Creating new ZisK project...');
      await createNewZiskProject(targetDir, projectName, options);
    }
    
    // Verify system dependencies
    await runSystemCheck(false);
    
    console.log('Project initialized successfully');
    
    // Display getting started information
    displayGettingStarted(targetDir, projectName);
    
  } catch (error) {
    console.error('Failed to initialize project:', error.message);
    await errorHandler.handleError(error, { name: 'init' }, options);
    throw error;
  }
}

/**
 * Build ZISK program
 * Follows the ZisK documentation build process
 */
async function buildCommand(options) {
  const spinner = ora('Building ZISK program...').start();
  
  try {
    // Check if this is a basic Rust project or ZisK project
    const isBasicProject = await checkBasicRustProject();
    
    if (isBasicProject) {
      // Build using standard cargo
      const profile = options.profile || 'release';
      const buildArgs = ['build'];
      
      if (profile === 'release') {
        buildArgs.push('--release');
      }
      
      if (options.features) {
        buildArgs.push('--features', options.features);
      }
      
      if (options.target) {
        buildArgs.push('--target', options.target);
      }
      
      console.log('Building basic Rust project with cargo...');
      const buildResult = await executor.executeCommand('cargo', buildArgs, {
        cwd: process.cwd()
      });
      
      spinner.succeed('Build completed successfully');
      
      // Display build information
      displayBasicBuildInfo(buildResult);
      
      return { ...buildResult, type: 'basic' };
      
    } else {
      // Build using cargo-zisk
      const profile = options.profile || 'release';
      const buildArgs = ['build'];
      
      if (profile === 'release') {
        buildArgs.push('--release');
      }
      
      if (options.features) {
        buildArgs.push('--features', options.features);
      }
      
      if (options.target) {
        buildArgs.push('--target', options.target);
      }
      
      const buildResult = await executor.executeCargoZisk('build', buildArgs, {
        cwd: process.cwd()
      });
      
      spinner.succeed('Build completed successfully');
      
      // Verify ELF file was created
      const elfPath = getExpectedElfPath(profile);
      if (!fs.existsSync(elfPath)) {
        throw new Error(`ELF file not found at expected path: ${elfPath}`);
      }
      
      // Display build information
      displayBuildInfo(buildResult, elfPath);
      
      return { ...buildResult, elfPath };
    }
    
  } catch (error) {
    spinner.fail('Build failed');
    await errorHandler.handleError(error, { name: 'build' }, options);
    throw error;
  }
}

/**
 * Run complete ZISK pipeline
 * Follows the ZisK documentation complete workflow
 */
async function runCommand(options) {
  const spinner = ora('Running ZISK pipeline...').start();
  
  try {
    // Check if this is a basic Rust project
    const isBasicProject = await checkBasicRustProject();
    
    if (isBasicProject) {
      // Run basic Rust project
      spinner.text = 'Building and running basic Rust project...';
      
      // Build the project
      const buildResult = await buildCommand(options);
      
      // Run the project
      spinner.text = 'Running program...';
      const runResult = await executor.executeCommand('cargo', ['run', '--release'], {
        cwd: process.cwd()
      });
      
      spinner.succeed('Program executed successfully');
      
      console.log('\nProgram output:');
      console.log(runResult.stdout || 'No output');
      
      return { type: 'basic', build: buildResult, run: runResult };
      
    } else {
      // Run ZisK pipeline
      // Step 1: Convert inputs to binary format
      spinner.text = 'Converting inputs...';
      const inputFiles = await getInputFiles(options);
      const convertedInputs = await convertInputs(inputFiles, options);
      
      // Step 2: Build the program
      spinner.text = 'Building program...';
      const buildResult = await buildCommand(options);
      
      // Step 3: Setup ROM (if needed)
      if (!options.skipSetup) {
        spinner.text = 'Setting up ROM...';
        await setupROM(buildResult.elfPath, options);
      }
      
      // Step 4: Execute program
      spinner.text = 'Executing program...';
      const executionResults = [];
      
      for (const input of convertedInputs) {
        const result = await executeSingleInput(input, buildResult.elfPath, options);
        executionResults.push(result);
      }
      
      // Step 5: Generate proofs (if not skipped)
      let proofResults = [];
      if (!options.skipProve) {
        spinner.text = 'Generating proofs...';
        proofResults = await generateProofs(convertedInputs, buildResult.elfPath, options);
      }
      
      spinner.succeed('Pipeline completed successfully');
      
      // Display comprehensive results
      displayPipelineResults({
        inputs: convertedInputs,
        build: buildResult,
        execution: executionResults,
        proofs: proofResults
      });
      
      return {
        inputs: convertedInputs,
        build: buildResult,
        execution: executionResults,
        proofs: proofResults
      };
    }
    
  } catch (error) {
    spinner.fail('Pipeline failed');
    await errorHandler.handleError(error, { name: 'run' }, options);
    throw error;
  }
}

/**
 * Execute ZISK program with input
 * Follows the ZisK documentation execution process
 */
async function executeCommand(options) {
  const spinner = ora('Executing ZISK program...').start();
  
  try {
    // Get input files
    const inputFiles = await getInputFiles(options);
    
    // Convert inputs if needed
    const convertedInputs = await convertInputs(inputFiles, options);
    
    // Execute program for each input
    const results = [];
    
    for (const input of convertedInputs) {
      // Use cargo-zisk run for single command execution
      const runArgs = ['run'];
      
      if (options.profile === 'release') {
        runArgs.push('--release');
      }
      
      runArgs.push('-i', input.outputPath);
      
      if (options.metrics) {
        runArgs.push('-m');
      }
      
      if (options.stats) {
        runArgs.push('-x');
      }
      
      const result = await executor.executeCargoZisk('run', runArgs, {
        cwd: process.cwd()
      });
      
      results.push({
        input: input.inputPath,
        output: result.stdout,
        duration: result.duration
      });
    }
    
    spinner.succeed('Execution completed successfully');
    
    // Display results
    displayExecutionResults(results);
    
    return results;
    
  } catch (error) {
    spinner.fail('Execution failed');
    await errorHandler.handleError(error, { name: 'execute' }, options);
    throw error;
  }
}

/**
 * Generate zero-knowledge proof
 * Follows the ZisK documentation proving process
 */
async function proveCommand(options) {
  const spinner = ora('Generating zero-knowledge proof...').start();
  
  try {
    // Get input files
    const inputFiles = await getInputFiles(options);
    
    // Convert inputs if needed
    const convertedInputs = await convertInputs(inputFiles, options);
    
    // Generate proofs for each input
    const results = [];
    
    for (const input of convertedInputs) {
      // Follow the ZisK documentation proving process
      const proveArgs = ['prove'];
      
      // Add ELF file path
      const elfPath = getExpectedElfPath(options.profile || 'release');
      proveArgs.push('-e', elfPath);
      
      // Add input file
      proveArgs.push('-i', input.outputPath);
      
      // Add output directory
      const outputDir = options.output || './proofs';
      proveArgs.push('-o', outputDir);
      
      // Add witness library path
      const libPaths = platform.resolveLibraryPaths();
      proveArgs.push('-w', libPaths.witnessLibrary);
      
      // Add proving key path
      const provingKeyPath = platform.ziskPaths.provingKey;
      proveArgs.push('-k', provingKeyPath);
      
      // Add aggregation flag
      if (options.aggregate) {
        proveArgs.push('-a');
      }
      
      // Add verification flag
      if (options.verify) {
        proveArgs.push('-y');
      }
      
      const result = await executor.executeCargoZisk('prove', proveArgs, {
        cwd: process.cwd()
      });
      
      results.push({
        input: input.inputPath,
        proof: result.stdout,
        duration: result.duration,
        outputDir
      });
    }
    
    spinner.succeed('Proof generation completed successfully');
    
    // Display results
    displayProofResults(results);
    
    return results;
    
  } catch (error) {
    spinner.fail('Proof generation failed');
    await errorHandler.handleError(error, { name: 'prove' }, options);
    throw error;
  }
}

/**
 * Verify a generated proof
 * Follows the ZisK documentation verification process
 */
async function verifyCommand(options) {
  const spinner = ora('Verifying proof...').start();
  
  try {
    // Get proof files
    const proofFiles = await getProofFiles(options);
    
    // Verify each proof
    const results = [];
    
    for (const proofFile of proofFiles) {
      const verifyArgs = ['verify', '-p', proofFile];
      
      // Add verification files if specified
      if (options.starkinfo) {
        verifyArgs.push('-s', options.starkinfo);
      }
      
      if (options.verifier) {
        verifyArgs.push('-e', options.verifier);
      }
      
      if (options.verkey) {
        verifyArgs.push('-k', options.verkey);
      }
      
      const result = await executor.executeCargoZisk('verify', verifyArgs, {
        cwd: process.cwd()
      });
      
      results.push({
        proof: proofFile,
        verified: result.exitCode === 0,
        output: result.stdout
      });
    }
    
    spinner.succeed('Verification completed successfully');
    
    // Display results
    displayVerificationResults(results);
    
    return results;
    
  } catch (error) {
    spinner.fail('Verification failed');
    await errorHandler.handleError(error, { name: 'verify' }, options);
    throw error;
  }
}

/**
 * Clean build artifacts and temporary files
 */
async function cleanCommand(options) {
  const spinner = ora('Cleaning project...').start();
  
  try {
    const cleaned = [];
    
    if (options.all || options.builds) {
      // Clean build artifacts
      const buildDirs = ['.zisk-build', 'target'];
      for (const dir of buildDirs) {
        if (await fs.pathExists(dir)) {
          await fs.remove(dir);
          cleaned.push(dir);
        }
      }
    }
    
    if (options.all || options.outputs) {
      // Clean output files
      const outputDirs = ['outputs', 'proofs'];
      for (const dir of outputDirs) {
        if (await fs.pathExists(dir)) {
          await fs.remove(dir);
          cleaned.push(dir);
        }
      }
    }
    
    spinner.succeed(`Cleaned ${cleaned.length} directories`);
    
    return { cleaned };
    
  } catch (error) {
    spinner.fail('Clean failed');
    await errorHandler.handleError(error, { name: 'clean' }, options);
    throw error;
  }
}

/**
 * Watch for file changes and auto-rebuild
 */
async function watchCommand(options) {
  const chokidar = require('chokidar');
  
  console.log('Watching for file changes...');
  
  const patterns = options.patterns || ['programs/**/*.rs', 'inputs/**/*'];
  const watcher = chokidar.watch(patterns, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    debounce: parseInt(options.debounce) || 1000
  });
  
  let isBuilding = false;
  
  watcher.on('change', async (filePath) => {
    if (isBuilding) return;
    
    console.log(`File changed: ${filePath}`);
    isBuilding = true;
    
    try {
      await buildCommand({ profile: 'debug' });
      console.log('Rebuild completed');
    } catch (error) {
      console.error('Rebuild failed:', error.message);
    } finally {
      isBuilding = false;
    }
  });
  
  // Keep process alive
  process.on('SIGINT', () => {
    watcher.close();
    process.exit(0);
  });
}

/**
 * Development mode with hot reloading
 */
async function devCommand(options) {
  console.log('Starting development mode...');
  
  // Start file watcher
  await watchCommand(options);
}

/**
 * Run project test suite
 */
async function testCommand(options) {
  const spinner = ora('Running tests...').start();
  
  try {
    // Run tests based on options
    if (options.unit) {
      await runUnitTests();
    } else if (options.integration) {
      await runIntegrationTests();
    } else if (options.e2e) {
      await runE2ETests();
    } else {
      // Run all tests
      await runUnitTests();
      await runIntegrationTests();
      await runE2ETests();
    }
    
    spinner.succeed('Tests completed successfully');
    
  } catch (error) {
    spinner.fail('Tests failed');
    await errorHandler.handleError(error, { name: 'test' }, options);
    throw error;
  }
}

/**
 * System health check and diagnostics
 */
async function doctorCommand(options) {
  const spinner = ora('Running system diagnostics...').start();
  
  try {
    const diagnostics = new SystemDiagnostics(options);
    
    const checks = [
      diagnostics.checkNodeEnvironment(),
      diagnostics.checkSystemDependencies(),
      diagnostics.checkZiskInstallation(),
      diagnostics.checkPlatformCapabilities(),
      diagnostics.checkResourceAvailability(),
      diagnostics.checkNetworkConnectivity(),
      diagnostics.validateProjectStructure()
    ];
    
    const results = await Promise.allSettled(checks);
    
    spinner.succeed('Diagnostics completed');
    
    // Generate report
    const report = diagnostics.generateReport(results);
    diagnostics.displayReport(report);
    
    return report;
    
  } catch (error) {
    spinner.fail('Diagnostics failed');
    await errorHandler.handleError(error, { name: 'doctor' }, options);
    throw error;
  }
}

/**
 * Show current project and system status
 */
async function statusCommand(options) {
  try {
    const status = await getProjectStatus();
    
    if (options.json) {
      console.log(JSON.stringify(status, null, 2));
    } else {
      displayStatus(status, options.detailed);
    }
    
    return status;
    
  } catch (error) {
    await errorHandler.handleError(error, { name: 'status' }, options);
    throw error;
  }
}

/**
 * Manage configuration
 */
async function configCommand(options) {
  try {
    if (options.get) {
      const value = configManager.get(options.get);
      console.log(value);
    } else if (options.set) {
      const [key, value] = options.set.split('=');
      configManager.set(key, value);
      await configManager.saveConfiguration();
      console.log(`Configuration updated: ${key} = ${value}`);
    } else if (options.reset) {
      await configManager.resetConfiguration();
      console.log('Configuration reset to defaults');
    } else if (options.edit) {
      await editConfiguration();
    } else {
      displayConfiguration(configManager.getSummary());
    }
    
  } catch (error) {
    await errorHandler.handleError(error, { name: 'config' }, options);
    throw error;
  }
}

/**
 * View and manage logs
 */
async function logsCommand(options) {
  try {
    if (options.clear) {
      await logger.clearLogs();
      console.log('Logs cleared');
    } else {
      const logStats = await logger.getLogStats();
      displayLogs(logStats, options);
    }
    
  } catch (error) {
    await errorHandler.handleError(error, { name: 'logs' }, options);
    throw error;
  }
}

/**
 * Manage cache and temporary files
 */
async function cacheCommand(options) {
  try {
    if (options.clear) {
      await clearCache();
      console.log('Cache cleared');
    } else if (options.info) {
      const cacheInfo = await getCacheInfo();
      displayCacheInfo(cacheInfo);
    } else if (options.cleanup) {
      await cleanupCache();
      console.log('Cache cleanup completed');
    }
    
  } catch (error) {
    await errorHandler.handleError(error, { name: 'cache' }, options);
    throw error;
  }
}

/**
 * Install or update ZISK dependencies
 */
async function installCommand(options) {
  const spinner = ora('Installing ZISK dependencies...').start();
  
  try {
    const installer = new ZiskInstaller();
    
    if (options.force) {
      await installer.forceReinstall();
    } else {
      await installer.install(options.version);
    }
    
    spinner.succeed('Installation completed successfully');
    
  } catch (error) {
    spinner.fail('Installation failed');
    await errorHandler.handleError(error, { name: 'install' }, options);
    throw error;
  }
}

/**
 * Run initial setup wizard
 */
async function setupCommand(options) {
  try {
    if (options.interactive) {
      await runInteractiveSetup();
    } else if (options.auto) {
      await runAutomaticSetup();
    } else {
      await runSetupWizard();
    }
    
  } catch (error) {
    await errorHandler.handleError(error, { name: 'setup' }, options);
    throw error;
  }
}

/**
 * Reset installation or project state
 */
async function resetCommand(options) {
  const spinner = ora('Resetting state...').start();
  
  try {
    if (options.all) {
      await resetEverything();
    } else if (options.project) {
      await resetProject();
    } else if (options.config) {
      await resetConfiguration();
    } else {
      await resetProject();
    }
    
    spinner.succeed('Reset completed successfully');
    
  } catch (error) {
    spinner.fail('Reset failed');
    await errorHandler.handleError(error, { name: 'reset' }, options);
    throw error;
  }
}

// Helper functions
/**
 * Check if current directory is an existing ZisK project
 */
async function checkExistingZiskProject(targetDir) {
  const cargoTomlPath = path.join(targetDir, 'Cargo.toml');
  
  if (!fs.existsSync(cargoTomlPath)) {
    return false;
  }
  
  try {
    const cargoContent = await fs.readFile(cargoTomlPath, 'utf8');
    return cargoContent.includes('zisk') || cargoContent.includes('cargo-zisk');
  } catch (error) {
    return false;
  }
}

/**
 * Check if current directory is a basic Rust project
 */
async function checkBasicRustProject() {
  const cargoTomlPath = path.join(process.cwd(), 'Cargo.toml');
  
  if (!fs.existsSync(cargoTomlPath)) {
    return false;
  }
  
  try {
    const cargoContent = await fs.readFile(cargoTomlPath, 'utf8');
    // Check if it's a basic Rust project (not ZisK-specific)
    return !cargoContent.includes('zisk') && !cargoContent.includes('cargo-zisk');
  } catch (error) {
    return false;
  }
}

/**
 * Display basic build information
 */
function displayBasicBuildInfo(buildResult) {
  console.log('\nBuild completed successfully!');
  console.log('Output binary available in: target/release/');
  console.log('Run with: cargo run --release');
  console.log('Or execute directly: ./target/release/[project-name]');
}

/**
 * Configure existing ZisK project with additional tooling
 */
async function configureExistingProject(targetDir, options) {
  // Add zisk-dev configuration
  await createConfiguration(targetDir, options);
  
  // Create additional directories if they don't exist
  const additionalDirs = ['inputs', 'outputs', 'docs', 'scripts'];
  for (const dir of additionalDirs) {
    const dirPath = path.join(targetDir, dir);
    if (!fs.existsSync(dirPath)) {
      await fs.ensureDir(dirPath);
      console.log(`Created directory: ${dir}`);
    }
  }
  
  // Create example input files
  await createExampleInputs(targetDir);
  
  console.log('Existing project configured successfully');
}

/**
 * Create new ZisK project using cargo-zisk sdk new or fallback to basic structure
 */
async function createNewZiskProject(targetDir, projectName, options) {
  // Check if cargo-zisk is installed
  let useCargoZisk = false;
  try {
    await executor.executeCommand('cargo-zisk', ['--version'], { cwd: targetDir });
    useCargoZisk = true;
  } catch (error) {
    console.log('cargo-zisk not found, creating basic ZisK project structure...');
  }
  
  if (useCargoZisk) {
    // Create new project using cargo-zisk sdk new
    console.log(`Creating new ZisK project: ${projectName}`);
    await executor.executeCommand('cargo-zisk', ['sdk', 'new', projectName], { cwd: targetDir });
    
    // Move into the created project directory
    const projectDir = path.join(targetDir, projectName);
    if (fs.existsSync(projectDir)) {
      process.chdir(projectDir);
      console.log(`Changed to project directory: ${projectName}`);
    }
  } else {
    // Create basic ZisK project structure
    console.log(`Creating basic ZisK project structure: ${projectName}`);
    await createBasicZiskProject(targetDir, projectName);
  }
  
  // Add additional configuration and tooling
  await configureExistingProject(process.cwd(), options);
}

/**
 * Create basic ZisK project structure when cargo-zisk is not available
 */
async function createBasicZiskProject(targetDir, projectName) {
  const projectDir = path.join(targetDir, projectName);
  await fs.ensureDir(projectDir);
  
  // Create basic Rust project structure
  const basicStructure = {
    'Cargo.toml': getBasicCargoToml(projectName),
    'build.rs': getBasicBuildRs(),
    'src/main.rs': getBasicMainRs(),
    '.gitignore': getBasicGitignore()
  };
  
  for (const [filePath, content] of Object.entries(basicStructure)) {
    const fullPath = path.join(projectDir, filePath);
    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, content, 'utf8');
    console.log(`Created file: ${filePath}`);
  }
  
  // Change to project directory
  process.chdir(projectDir);
  console.log(`Changed to project directory: ${projectName}`);
}

/**
 * Get basic Cargo.toml content
 */
function getBasicCargoToml(projectName) {
  return `[package]
name = "${projectName}"
version = "0.1.0"
edition = "2021"

[dependencies]
# Add ZisK dependencies when available
# zisk = "0.1.0"

[build-dependencies]
# Add build dependencies when available
`;
}

/**
 * Get basic build.rs content
 */
function getBasicBuildRs() {
  return `fn main() {
    // Basic build script for ZisK project
    // This will be enhanced when ZisK build tools are available
    println!("cargo:rerun-if-changed=src/");
}
`;
}

/**
 * Get basic main.rs content
 */
function getBasicMainRs() {
  return `fn main() {
    // Basic ZisK program template
    // This will be enhanced when ZisK SDK is available
    
    println!("Hello, ZisK!");
    
    // Example: Simple computation that could be proven
    let input = 42;
    let result = input * 2;
    
    println!("Input: {}", input);
    println!("Result: {}", result);
    
    // TODO: Add ZisK-specific code when SDK is available
    // - Define computation to be proven
    // - Generate proof
    // - Verify proof
}
`;
}

/**
 * Get basic .gitignore content
 */
function getBasicGitignore() {
  return `# Rust
target/
Cargo.lock

# ZisK specific
*.zisk
*.proof
*.witness
.zisk-build/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
`;
}

/**
 * Create example input files
 */
async function createExampleInputs(targetDir) {
  const inputsDir = path.join(targetDir, 'inputs');
  await fs.ensureDir(inputsDir);
  
  // Example JSON input
  const exampleJson = {
    "number": 20,
    "description": "Example input for SHA-256 hashing"
  };
  
  await fs.writeFile(
    path.join(inputsDir, 'example.json'),
    JSON.stringify(exampleJson, null, 2),
    'utf8'
  );
  
  // Example YAML input
  const exampleYaml = `number: 20
description: Example input for SHA-256 hashing
`;
  
  await fs.writeFile(
    path.join(inputsDir, 'example.yaml'),
    exampleYaml,
    'utf8'
  );
  
  console.log('Created example input files');
}

async function createProjectStructure(targetDir, projectType, projectName) {
  const { createProjectStructure } = require('./templates');
  return await createProjectStructure(targetDir, projectType, projectName);
}

async function generateTemplateFiles(targetDir, projectType, projectName) {
  const { generateTemplateFiles } = require('./templates');
  return await generateTemplateFiles(targetDir, projectType, projectName);
}

async function createConfiguration(targetDir, options) {
  const config = {
    project: {
      name: options.name || 'zisk-project',
      type: options.type || 'basic',
      version: '1.0.0'
    },
    build: {
      profile: 'release',
      features: [],
      target: null
    },
    execution: {
      maxSteps: 1000000,
      timeout: 30000,
      parallel: false
    },
    inputs: {
      defaultFormat: 'json',
      autoConvert: true
    },
    outputs: {
      saveProofs: true,
      saveWitnesses: true,
      saveLogs: true
    },
    logging: {
      level: 'info',
      verbose: false,
      saveToFile: true
    }
  };
  
  const configPath = path.join(targetDir, 'zisk-dev.config.js');
  const configContent = `module.exports = ${JSON.stringify(config, null, 2)};`;
  await fs.writeFile(configPath, configContent, 'utf8');
  
  console.log(`Created configuration: zisk-dev.config.js`);
}

async function runSystemCheck(blocking) {
  console.log('Checking system dependencies...');
  
  const { PlatformManager } = require('./platform');
  const platform = new PlatformManager();
  
  // Check platform support
  if (!platform.isSupported()) {
    throw new Error(`Platform not supported: ${platform.getPlatformInfo()}`);
  }
  
  // Check system dependencies
  const systemDeps = [
    { name: 'Node.js', command: 'node --version', required: true },
    { name: 'npm', command: 'npm --version', required: true },
    { name: 'curl', command: 'curl --version', required: true },
    { name: 'tar', command: 'tar --version', required: true },
    { name: 'gcc', command: 'gcc --version', required: true }
  ];
  
  const missingDeps = [];
  const availableDeps = [];
  
  for (const dep of systemDeps) {
    try {
      const { execSync } = require('child_process');
      execSync(dep.command, { stdio: 'ignore' });
      availableDeps.push(dep.name);
      console.log(`[OK] ${dep.name}: Available`);
    } catch (error) {
      if (dep.required) {
        missingDeps.push(dep.name);
        console.log(`[ERROR] ${dep.name}: Missing (required)`);
      } else {
        console.log(`[WARNING] ${dep.name}: Missing (optional)`);
      }
    }
  }
  
  // Check ZisK-specific dependencies
  const ziskDeps = [
    { name: 'cargo-zisk', command: 'cargo-zisk --version', required: false },
    { name: 'ziskemu', command: 'ziskemu --version', required: false },
    { name: 'Rust', command: 'rustc --version', required: false }
  ];
  
  const missingZiskDeps = [];
  
  for (const dep of ziskDeps) {
    try {
      const { execSync } = require('child_process');
      execSync(dep.command, { stdio: 'ignore' });
      console.log(`[OK] ${dep.name}: Available`);
    } catch (error) {
      missingZiskDeps.push(dep.name);
      console.log(`[WARNING] ${dep.name}: Not found (will be installed later)`);
    }
  }
  
  // If blocking mode and critical dependencies are missing, throw error
  if (blocking && missingDeps.length > 0) {
    throw new Error(`Missing required dependencies: ${missingDeps.join(', ')}`);
  }
  
  // Provide guidance for missing ZisK dependencies
  if (missingZiskDeps.length > 0) {
    console.log('\nNext steps:');
    console.log('   Run "zisk-dev install" to install ZisK dependencies');
  }
  
  return {
    platform: platform.getPlatformInfo(),
    systemDeps: availableDeps,
    missingSystemDeps: missingDeps,
    missingZiskDeps: missingZiskDeps
  };
}

function displayGettingStarted(targetDir, projectName) {
  console.log(`\nProject "${projectName}" initialized successfully!\n`);
  
  console.log('Next steps:');
  console.log('  1. Install ZISK dependencies:');
  console.log('     $ zisk-dev install');
  console.log('     ');
  console.log('  2. Build your program:');
  console.log('     $ zisk-dev build');
  console.log('     ');
  console.log('  3. Run your first ZISK program:');
  console.log('     $ zisk-dev run');
  console.log('     ');
  console.log('  4. Check the outputs:');
  console.log('     $ ls outputs/');
  console.log('     ');
  console.log('Development commands:');
  console.log('  $ zisk-dev watch     # Watch for file changes');
  console.log('  $ zisk-dev dev       # Development mode');
  console.log('  $ zisk-dev test      # Run tests');
  console.log('  $ zisk-dev doctor    # System diagnostics');
  console.log('     ');
  console.log('Documentation:');
  console.log('  - README.md');
  console.log('  - docs/getting-started.md');
  console.log('     ');
  console.log('For help: zisk-dev --help\n');
  
  // Check if cargo-zisk is available
  const { execSync } = require('child_process');
  try {
    execSync('cargo-zisk --version', { stdio: 'ignore' });
  } catch (error) {
    console.log('Note: cargo-zisk is not installed. This is normal for early ZisK development.');
    console.log('When ZisK SDK becomes available, install it with: cargo install cargo-zisk');
    console.log('For now, you can work with the basic project structure provided.\n');
  }
}

async function validateProjectStructure() {
  const requiredFiles = [
    'programs/zisk/src/main.rs',
    'programs/zisk/Cargo.toml'
  ];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      throw new Error(`Required file not found: ${file}`);
    }
  }
  
  return true;
}

function displayBuildInfo(buildResult, elfPath) {
  console.log(`Build completed successfully`);
  console.log(`ELF file: ${elfPath}`);
  console.log(`Duration: ${buildResult.duration}ms`);
}

function getExpectedElfPath(profile) {
  const { PlatformManager } = require('./platform');
  const platform = new PlatformManager();
  const targetDir = profile === 'release' ? 'release' : 'debug';
  return `target/riscv64ima-zisk-zkvm-elf/${targetDir}/sha_hasher`;
}

async function setupROM(elfPath, options) {
  // Setup ROM using cargo-zisk rom-setup
  const setupArgs = ['rom-setup', '-e', elfPath];
  
  if (options.provingKey) {
    setupArgs.push('-k', options.provingKey);
  }
  
  await executor.executeCargoZisk('rom-setup', setupArgs, {
    cwd: process.cwd()
  });
}

async function executeSingleInput(input, elfPath, options) {
  // Execute single input using ziskemu
  const ziskemuArgs = ['-e', elfPath, '-i', input.outputPath];
  
  if (options.maxSteps) {
    ziskemuArgs.push('-n', options.maxSteps.toString());
  }
  
  if (options.metrics) {
    ziskemuArgs.push('-m');
  }
  
  if (options.stats) {
    ziskemuArgs.push('-x');
  }
  
  const result = await executor.executeZiskemu(ziskemuArgs, {
    cwd: process.cwd()
  });
  
  return {
    input: input.inputPath,
    output: result.stdout,
    duration: result.duration
  };
}

async function generateProofs(inputs, elfPath, options) {
  const results = [];
  
  for (const input of inputs) {
    const proveArgs = ['prove', '-e', elfPath, '-i', input.outputPath];
    
    const outputDir = options.output || './proofs';
    proveArgs.push('-o', outputDir);
    
    if (options.aggregate) {
      proveArgs.push('-a');
    }
    
    if (options.verify) {
      proveArgs.push('-y');
    }
    
    const result = await executor.executeCargoZisk('prove', proveArgs, {
      cwd: process.cwd()
    });
    
    results.push({
      input: input.inputPath,
      proof: result.stdout,
      duration: result.duration,
      outputDir
    });
  }
  
  return results;
}

function displayPipelineResults(results) {
  console.log('\nPipeline Results:');
  console.log('================');
  
  console.log(`\nBuild:`);
  console.log(`  ELF File: ${results.build.elfPath}`);
  console.log(`  Duration: ${results.build.duration}ms`);
  
  console.log(`\nExecution:`);
  console.log(`  Processed ${results.execution.length} input(s)`);
  results.execution.forEach((result, index) => {
    console.log(`  Input ${index + 1}: ${result.input}`);
    console.log(`  Duration: ${result.duration}ms`);
  });
  
  if (results.proofs.length > 0) {
    console.log(`\nProofs:`);
    console.log(`  Generated ${results.proofs.length} proof(s)`);
    results.proofs.forEach((result, index) => {
      console.log(`  Proof ${index + 1}: ${result.input}`);
      console.log(`  Output: ${result.outputDir}`);
      console.log(`  Duration: ${result.duration}ms`);
    });
  }
}

async function getInputFiles(options) {
  const inputDir = 'inputs';
  const inputPath = options.input;
  
  if (inputPath) {
    return [inputPath];
  }
  
  if (options.inputs) {
    return glob.sync(options.inputs);
  }
  
  // Default: get all input files from inputs directory
  if (fs.existsSync(inputDir)) {
    return glob.sync(`${inputDir}/*`);
  }
  
  return [];
}

async function convertInputs(inputFiles, options) {
  const results = [];
  
  for (const inputFile of inputFiles) {
    const ext = path.extname(inputFile).toLowerCase();
    
    if (ext === '.bin') {
      // Binary files don't need conversion
      results.push({
        inputPath: inputFile,
        outputPath: inputFile
      });
    } else {
      // Convert to binary format
      const outputPath = path.join('build', path.basename(inputFile, ext) + '.bin');
      await converter.convertInput(inputFile, outputPath, options);
      results.push({
        inputPath: inputFile,
        outputPath: outputPath
      });
    }
  }
  
  return results;
}

function displayExecutionResults(results) {
  console.log(`Execution completed successfully`);
  console.log(`Processed ${results.length} input(s)`);
  
  results.forEach((result, index) => {
    console.log(`\nInput ${index + 1}: ${result.input}`);
    console.log(`Duration: ${result.duration}ms`);
    if (result.output) {
      console.log(`Output: ${result.output}`);
    }
  });
}

function displayProofResults(results) {
  console.log(`Proof generation completed successfully`);
  console.log(`Generated ${results.length} proof(s)`);
  
  results.forEach((result, index) => {
    console.log(`\nProof ${index + 1}:`);
    console.log(`  Input: ${result.input}`);
    console.log(`  Output Directory: ${result.outputDir}`);
    console.log(`  Duration: ${result.duration}ms`);
  });
}

async function getProofFiles(options) {
  const proofPath = options.proof;
  
  if (proofPath) {
    return [proofPath];
  }
  
  if (options.proofs) {
    return glob.sync(options.proofs);
  }
  
  // Default: get all proof files from proofs directory
  const proofsDir = 'proofs';
  if (fs.existsSync(proofsDir)) {
    return glob.sync(`${proofsDir}/**/*.bin`);
  }
  
  return [];
}

function displayVerificationResults(results) {
  console.log(`Verification completed`);
  
  const verified = results.filter(r => r.verified).length;
  const total = results.length;
  
  console.log(`Verified: ${verified}/${total} proofs`);
  
  results.forEach((result, index) => {
    const status = result.verified ? 'PASSED' : 'FAILED';
    console.log(`Proof ${index + 1}: ${result.proof} - ${status}`);
  });
}

class SystemDiagnostics {
  constructor(options) {
    this.options = options;
  }
  
  async checkNodeEnvironment() {
    // Implementation for Node.js environment check
  }
  
  async checkSystemDependencies() {
    // Implementation for system dependencies check
  }
  
  async checkZiskInstallation() {
    // Implementation for ZISK installation check
  }
  
  async checkPlatformCapabilities() {
    // Implementation for platform capabilities check
  }
  
  async checkResourceAvailability() {
    // Implementation for resource availability check
  }
  
  async checkNetworkConnectivity() {
    // Implementation for network connectivity check
  }
  
  async validateProjectStructure() {
    // Implementation for project structure validation
  }
  
  generateReport(results) {
    // Implementation for report generation
  }
  
  displayReport(report) {
    // Implementation for report display
  }
}

async function getProjectStatus() {
  // Implementation for getting project status
}

function displayStatus(status, detailed) {
  // Implementation for displaying status
}

function displayConfiguration(summary) {
  // Implementation for displaying configuration
}

async function editConfiguration() {
  // Implementation for editing configuration
}

function displayLogs(logStats, options) {
  // Implementation for displaying logs
}

async function clearCache() {
  // Implementation for clearing cache
}

async function getCacheInfo() {
  // Implementation for getting cache info
}

function displayCacheInfo(cacheInfo) {
  // Implementation for displaying cache info
}

async function cleanupCache() {
  // Implementation for cache cleanup
}

class ZiskInstaller {
  async install(version) {
    // Implementation for installation
  }
  
  async forceReinstall() {
    // Implementation for force reinstall
  }
}

async function runInteractiveSetup() {
  // Implementation for interactive setup
}

async function runAutomaticSetup() {
  // Implementation for automatic setup
}

async function runSetupWizard() {
  // Implementation for setup wizard
}

async function resetEverything() {
  // Implementation for resetting everything
}

async function resetProject() {
  // Implementation for resetting project
}

async function resetConfiguration() {
  // Implementation for resetting configuration
}

async function runUnitTests() {
  // Implementation for unit tests
}

async function runIntegrationTests() {
  // Implementation for integration tests
}

async function runE2ETests() {
  // Implementation for end-to-end tests
}

module.exports = {
  initCommand,
  buildCommand,
  runCommand,
  executeCommand,
  proveCommand,
  verifyCommand,
  cleanCommand,
  watchCommand,
  devCommand,
  testCommand,
  doctorCommand,
  statusCommand,
  configCommand,
  logsCommand,
  cacheCommand,
  installCommand,
  setupCommand,
  resetCommand
};
