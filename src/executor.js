/**
 * Command Execution System
 * Handles secure command execution with proper error handling and logging
 */

const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs-extra');
const { Logger } = require('./logger');
const { ErrorHandler, BuildError, ExecutionError } = require('./errors');

const execAsync = promisify(exec);

class CommandExecutor {
  constructor() {
    this.logger = new Logger();
    this.errorHandler = new ErrorHandler();
    this.allowedCommands = new Set([
      'cargo', 'cargo-zisk', 'ziskemu', 'rustc', 'rustup', 'node', 'npm', 'tar', 'curl', 'wget',
      'git', 'make', 'gcc', 'clang', 'mpirun', 'nvidia-smi'
    ]);
  }

  /**
   * Execute command with full logging and error handling
   */
  async executeCommand(command, args = [], options = {}) {
    const startTime = Date.now();
    const commandId = this.generateCommandId();

    // Log command execution
    this.logger.logCommand(command, args, options);

    try {
      // Validate command
      this.validateCommand(command);

      // Prepare execution options
      const execOptions = this.prepareExecutionOptions(options);
      execOptions.startTime = startTime; // Pass start time for duration calculation

      // Execute command
      const result = await this.runCommand(command, args, execOptions);

      // Log command result
      this.logger.logCommandResult(command, result);

      // Log performance
      const duration = Date.now() - startTime;
      this.logger.logPerformance(`command:${command}`, duration, {
        commandId,
        exitCode: result.exitCode
      });

      return result;
    } catch (error) {
      // Handle error with context
      const errorContext = await this.errorHandler.handleError(error, {
        name: command,
        args,
        startTime
      }, options);

      throw error;
    }
  }

  /**
   * Execute cargo-zisk command specifically
   */
  async executeCargoZisk(subcommand, args = [], options = {}) {
    const { PlatformManager } = require('./platform');
    const platform = new PlatformManager();
    const libPaths = platform.resolveLibraryPaths();

    // Build cargo-zisk command
    const cargoZiskArgs = [subcommand, ...args];
    
    // Add platform-specific flags
    const buildFlags = platform.getBuildFlags();
    cargoZiskArgs.push(...buildFlags);

    // Execute with cargo-zisk binary
    return this.executeCommand(libPaths.cargoZisk, cargoZiskArgs, options);
  }

  /**
   * Execute ziskemu command specifically
   */
  async executeZiskemu(args = [], options = {}) {
    const { PlatformManager } = require('./platform');
    const platform = new PlatformManager();
    const libPaths = platform.resolveLibraryPaths();

    return this.executeCommand(libPaths.ziskemu, args, options);
  }

  /**
   * Execute command with MPI support
   */
  async executeWithMPI(command, args = [], options = {}) {
    const { PlatformManager } = require('./platform');
    const platform = new PlatformManager();

    if (!platform.capabilities.mpiSupport) {
      throw new Error('MPI support not available on this platform');
    }

    const mpiArgs = [
      '--bind-to', 'none',
      '-np', options.processes || '1',
      '-x', 'OMP_NUM_THREADS=' + (options.threadsPerProcess || '1'),
      '-x', 'RAYON_NUM_THREADS=' + (options.threadsPerProcess || '1')
    ];

    const fullArgs = [...mpiArgs, command, ...args];

    return this.executeCommand('mpirun', fullArgs, options);
  }

  /**
   * Validate command is allowed
   */
  validateCommand(command) {
    const baseCommand = command.split(' ')[0];
    
    // Extract just the command name from full path
    const commandName = path.basename(baseCommand);
    
    // Check if the command name is allowed
    if (!this.allowedCommands.has(commandName)) {
      // Special case for cargo-zisk binary
      if (commandName === 'cargo-zisk') {
        return; // Allow cargo-zisk binary
      }
      throw new Error(`Command not allowed: ${baseCommand}`);
    }
  }

  /**
   * Prepare execution options
   */
  prepareExecutionOptions(options) {
    const defaultOptions = {
      cwd: process.cwd(),
      env: { ...process.env },
      stdio: 'pipe',
      timeout: 300000, // 5 minutes
      maxBuffer: 1024 * 1024 * 10 // 10MB
    };

    // Merge with provided options
    const execOptions = { ...defaultOptions, ...options };

    // Add environment variables
    if (options.env) {
      execOptions.env = { ...execOptions.env, ...options.env };
    }

    return execOptions;
  }

  /**
   * Run command with spawn
   */
  async runCommand(command, args, options) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, options);
      
      let stdout = '';
      let stderr = '';
      let killed = false;

      // Set up timeout
      const timeout = setTimeout(() => {
        if (!killed) {
          killed = true;
          child.kill('SIGTERM');
          reject(new Error(`Command timed out after ${options.timeout}ms`));
        }
      }, options.timeout);

      // Collect stdout
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      // Collect stderr
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle completion
      child.on('close', (code) => {
        clearTimeout(timeout);
        
        if (killed) return;

        const result = {
          exitCode: code,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          duration: Date.now() - (options.startTime || Date.now())
        };

        if (code === 0) {
          resolve(result);
        } else {
          reject(new ExecutionError(`Command failed with exit code ${code}`, {
            command,
            args,
            result
          }));
        }
      });

      // Handle errors
      child.on('error', (error) => {
        clearTimeout(timeout);
        if (!killed) {
          reject(new ExecutionError(`Command execution failed: ${error.message}`, {
            command,
            args,
            error
          }));
        }
      });
    });
  }

  /**
   * Generate unique command ID
   */
  generateCommandId() {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Execute command with streaming output
   */
  async executeWithStreaming(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        ...this.prepareExecutionOptions(options),
        stdio: ['inherit', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        process.stdout.write(output);
      });

      child.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        process.stderr.write(output);
      });

      child.on('close', (code) => {
        const result = {
          exitCode: code,
          stdout: stdout.trim(),
          stderr: stderr.trim()
        };

        if (code === 0) {
          resolve(result);
        } else {
          reject(new ExecutionError(`Command failed with exit code ${code}`, {
            command,
            args,
            result
          }));
        }
      });

      child.on('error', (error) => {
        reject(new ExecutionError(`Command execution failed: ${error.message}`, {
          command,
          args,
          error
        }));
      });
    });
  }

  /**
   * Execute command with progress tracking
   */
  async executeWithProgress(command, args = [], options = {}) {
    const ora = require('ora');
    const spinner = ora(`Executing ${command}...`).start();

    try {
      const result = await this.executeCommand(command, args, options);
      spinner.succeed(`${command} completed successfully`);
      return result;
    } catch (error) {
      spinner.fail(`${command} failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if command exists
   */
  async commandExists(command) {
    try {
      await execAsync(`which ${command}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get command version
   */
  async getCommandVersion(command) {
    try {
      const { stdout } = await execAsync(`${command} --version`);
      return stdout.trim();
    } catch {
      return null;
    }
  }
}

/**
 * ZISK Command Builder
 * Builds ZISK-specific commands with proper arguments
 */
class ZiskCommandBuilder {
  constructor() {
    this.platform = new PlatformManager();
  }

  /**
   * Build cargo-zisk build command
   */
  buildBuildCommand(options = {}) {
    const args = ['build'];

    if (options.profile) {
      args.push('--profile', options.profile);
    }

    if (options.features && options.features.length > 0) {
      args.push('--features', options.features.join(','));
    }

    if (options.target) {
      args.push('--target', options.target);
    }

    return { command: 'cargo-zisk', args };
  }

  /**
   * Build cargo-zisk run command
   */
  buildRunCommand(inputPath, options = {}) {
    const args = ['run'];

    if (options.profile) {
      args.push('--profile', options.profile);
    }

    if (inputPath) {
      args.push('-i', inputPath);
    }

    if (options.metrics) {
      args.push('-m');
    }

    if (options.stats) {
      args.push('-x');
    }

    return { command: 'cargo-zisk', args };
  }

  /**
   * Build cargo-zisk prove command
   */
  buildProveCommand(inputPath, options = {}) {
    const args = ['prove'];

    if (inputPath) {
      args.push('-i', inputPath);
    }

    if (options.output) {
      args.push('-o', options.output);
    }

    if (options.verify) {
      args.push('-y');
    }

    if (options.aggregate) {
      args.push('-a');
    }

    return { command: 'cargo-zisk', args };
  }

  /**
   * Build cargo-zisk verify command
   */
  buildVerifyCommand(proofPath, options = {}) {
    const args = ['verify'];

    if (proofPath) {
      args.push('-p', proofPath);
    }

    return { command: 'cargo-zisk', args };
  }

  /**
   * Build ziskemu command
   */
  buildZiskemuCommand(elfPath, inputPath, options = {}) {
    const args = [];

    if (elfPath) {
      args.push('-e', elfPath);
    }

    if (inputPath) {
      args.push('-i', inputPath);
    }

    if (options.maxSteps) {
      args.push('-n', options.maxSteps.toString());
    }

    if (options.metrics) {
      args.push('-m');
    }

    if (options.stats) {
      args.push('-x');
    }

    return { command: 'ziskemu', args };
  }
}

module.exports = { CommandExecutor, ZiskCommandBuilder };
