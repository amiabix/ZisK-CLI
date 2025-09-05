#!/usr/bin/env node

/**
 * Standalone welcome command for ZisK CLI
 * Shows the sleepy cat animation and welcome message
 */

function showWelcome() {
  console.log('      |\\---/|');
  console.log('      | ,_, |');
  console.log('       \\_`_/-..----.');
  console.log('    ___/ `   \' ,""+ \\');
  console.log('   (__...\'   __\\    |`.___.\';');
  console.log('     (_,...\'(_,.`__)/\'.....+');
  console.log('');
  console.log('Welcome to ZisK CLI!');
  console.log('');
  console.log('Quick Start Commands:');
  console.log('  zisk-dev init --name my-project    # Create new ZisK project');
  console.log('  zisk-dev build                     # Build your program');
  console.log('  zisk-dev run                       # Build and execute');
  console.log('  zisk-dev --help                    # See all commands');
  console.log('');
  console.log('Important Notice:');
  console.log('This is a personal CLI tool for testing and learning purposes.');
  console.log('For production use, please refer to the official ZisK documentation.');
  console.log('');
  console.log('Happy building with ZisK!');
}

// Run the welcome message
showWelcome();
