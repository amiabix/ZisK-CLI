#!/usr/bin/env node

const { Command } = require('commander');

const program = new Command();

program
  .name('test-cli')
  .description('Test CLI')
  .version('1.0.0');

program
  .command('init')
  .description('Test init command')
  .action(() => {
    console.log('Init command executed successfully!');
  });

program.parse(process.argv);
