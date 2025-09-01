#!/usr/bin/env node

/**
 * Post-install script for zisk-dev CLI tool
 * Runs after npm install to verify installation and provide setup guidance
 */

const { PlatformManager } = require('../src/platform');
const { Logger } = require('../src/logger');
const chalk = require('chalk');
const { default: chalkDefault } = require('chalk');
const chalkInstance = chalkDefault || chalk;

async function postInstall() {
  const logger = new Logger();
  const platform = new PlatformManager();
  
  console.log(chalkInstance.blue('Verifying zisk-dev installation...'));
  
  try {
    // 1. Check Node.js version
    await checkNodeVersion();
    
    // 2. Check platform compatibility
    await checkPlatformCompatibility(platform);
    
    // 3. Check system dependencies
    await checkSystemDependencies();
    
    // 4. Display next steps
    displayNextSteps();
    
  } catch (error) {
    console.error(chalkInstance.red('ERROR: Installation verification failed:'), error.message);
    console.log(chalk.yellow('You can still use zisk-dev, but some features may not work properly.'));
  }
}

async function checkNodeVersion() {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 16) {
    throw new Error(`Node.js version ${nodeVersion} is not supported. Please upgrade to Node.js 16 or later.`);
  }
  
      console.log(chalkInstance.green(`Node.js version: ${nodeVersion}`));
}

async function checkPlatformCompatibility(platform) {
  if (!platform.isSupported()) {
    throw new Error(`Platform not supported: ${platform.getPlatformInfo()}`);
  }
  
      console.log(chalkInstance.green(`Platform: ${platform.getPlatformInfo()}`));
  
  // Display platform capabilities
  const capabilities = platform.capabilities;
      console.log(chalkInstance.blue('Platform capabilities:'));
        console.log(`  - ASM Runner: ${capabilities.asmRunner ? 'YES' : 'NO'}`);
      console.log(`  - MPI Support: ${capabilities.mpiSupport ? 'YES' : 'NO'}`);
      console.log(`  - GPU Support: ${capabilities.gpuSupport ? 'YES' : 'NO'}`);
      console.log(`  - Full ZISK Support: ${capabilities.fullZiskSupport ? 'YES' : 'NO'}`);
}

async function checkSystemDependencies() {
  const { execSync } = require('child_process');
  
  const dependencies = [
    { name: 'curl', command: 'curl --version' },
    { name: 'tar', command: 'tar --version' },
    { name: 'gcc', command: 'gcc --version' }
  ];
  
  for (const dep of dependencies) {
    try {
      execSync(dep.command, { stdio: 'ignore' });
      console.log(chalkInstance.green(`${dep.name}: Available`));
    } catch {
              console.log(chalkInstance.yellow(`WARNING: ${dep.name}: Not found (may be required for some operations)`));
    }
  }
}

function displayNextSteps() {
  console.log(`
${chalkInstance.green('zisk-dev installed successfully!')}

${chalkInstance.blue('Next steps:')}
  1. Install ZISK dependencies:
     ${chalkInstance.cyan('$ zisk-dev install')}
     
  2. Create a new project:
     ${chalkInstance.cyan('$ mkdir my-project && cd my-project')}
${chalkInstance.cyan('$ zisk-dev init')}
     
  3. Run your first ZISK program:
     ${chalkInstance.cyan('$ zisk-dev run')}
     
${chalkInstance.blue('For help:')} ${chalkInstance.cyan('zisk-dev --help')}
${chalkInstance.blue('Documentation:')} ${chalkInstance.cyan('https://github.com/0xPolygonHermez/zisk-dev#readme')}

${chalkInstance.yellow('Note:')} Some features may require additional system dependencies.
Run ${chalkInstance.cyan('zisk-dev doctor')} to check your system configuration.
`);
}

// Run post-install if this script is executed directly
if (require.main === module) {
  postInstall().catch(error => {
    console.error('Post-install failed:', error);
    process.exit(1);
  });
}

module.exports = { postInstall };
