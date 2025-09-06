/**
 * Command Execution System
 * Handles secure command execution with proper error handling and logging
 */

const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const pLimit = require('p-limit');
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
    
    // Add parallelism control
    this.processPool = pLimit(this.getMaxConcurrent());
    
    // Safe environment variables
    this.safeEnvVars = new Set([
      'OMP_NUM_THREADS', 'RAYON_NUM_THREADS', 'RUST_LOG', 'CARGO_TARGET_DIR',
      'PATH', 'HOME', 'USER', 'SHELL', 'TMPDIR', 'TMP', 'TEMP'
    ]);
    
    // Add ZISK_* variables
    this.addZiskEnvVars();
  }

  /**
   * Get maximum concurrent processes to prevent system overload
   */
  getMaxConcurrent() {
    const envValue = parseInt(process.env.ZISK_MAX_CONCURRENT);
    const defaultValue = Math.max(1, Math.floor(os.cpus().length / 2));
    const maxAllowed = 16;
    
    if (envValue > 0 && envValue <= maxAllowed) {
      return envValue;
    }
    
    return Math.min(defaultValue, maxAllowed);
  }

  /**
   * Add ZISK_* environment variables to safe list
   * Use regex pattern and explicitly block dangerous variables
   */
  addZiskEnvVars() {
    const env = process.env;
    const ziskPattern = /^ZISK_/;
    
    for (const key in env) {
      if (ziskPattern.test(key)) {
        this.safeEnvVars.add(key);
      }
    }
    
    // Explicitly block dangerous variables even if they start with ZISK_
    const blockedVars = ['ZISK_PATH', 'ZISK_LD_LIBRARY_PATH', 'ZISK_LD_PRELOAD'];
    blockedVars.forEach(varName => this.safeEnvVars.delete(varName));
  }

  /**
   * Security: Validate and normalize file paths to prevent traversal attacks
   */
  validateAndNormalizePath(inputPath, allowAbsolute = false, baseDir = process.cwd()) {
    if (!inputPath || typeof inputPath !== 'string') {
      throw new Error('Invalid path provided');
    }

    // Normalize the path
    const normalized = path.normalize(inputPath);
    
    // Check for absolute paths if not allowed
    if (!allowAbsolute && path.isAbsolute(normalized)) {
      throw new Error('Absolute paths not allowed');
    }

    // Check for path traversal attempts
    if (normalized.includes('..') || normalized.includes('~')) {
      throw new Error('Path traversal detected');
    }

    // Resolve against base directory to ensure it's within bounds
    const resolved = path.resolve(baseDir, normalized);
    const baseResolved = path.resolve(baseDir);
    
    if (!resolved.startsWith(baseResolved)) {
      throw new Error('Path outside allowed directory');
    }

    return normalized;
  }

  /**
   * Sanitize environment variables for process execution
   */
  sanitizeEnvironment(env = {}) {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(env)) {
      if (this.safeEnvVars.has(key)) {
        // For paths, validate boundaries instead of aggressive sanitization
        if (key.includes('PATH') || key.includes('DIR')) {
          sanitized[key] = this.validatePathBoundaries(value);
        } else {
          // Basic sanitization for non-path values
          sanitized[key] = String(value).replace(/[\x00-\x1F\x7F-\x9F]/g, '');
        }
      }
    }
    
    return sanitized;
  }

  /**
   * Validate path boundaries without over-sanitizing
   * @param {string} pathValue - Path value to validate
   * @returns {string} Validated path
   */
  validatePathBoundaries(pathValue) {
    if (typeof pathValue !== 'string') {
      return String(pathValue);
    }
    
    // Only remove control characters, preserve legitimate path characters
    return pathValue.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  }

  /**
   * Sanitize string inputs to prevent injection
   */
  sanitizeString(input) {
    if (typeof input !== 'string') {
      return String(input);
    }
    
    // Remove control characters and potential injection patterns
    return input
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
      .replace(/[;&|`$(){}[\]\\]/g, '') // Remove shell metacharacters
      .trim();
  }

  /**
   * Redact sensitive values from logs
   * @param {string} message - Log message to redact
   * @returns {string} Redacted message
   */
  redactSensitiveValues(message) {
    if (typeof message !== 'string') {
      return String(message);
    }

    // Redact sensitive patterns
    let redacted = message
      .replace(/--proving-key\s+\S+/g, '--proving-key [REDACTED]')
      .replace(/--witness\s+\S+/g, '--witness [REDACTED]')
      .replace(/--key\s+\S+/g, '--key [REDACTED]')
      .replace(/--secret\s+\S+/g, '--secret [REDACTED]')
      .replace(/\/\.ssh\/[^\s]+/g, '/.ssh/[REDACTED]')
      .replace(/\/\.zisk\/[^\s]+/g, '/.zisk/[REDACTED]')
      .replace(/password[=:]\s*\S+/gi, 'password=[REDACTED]')
      .replace(/token[=:]\s*\S+/gi, 'token=[REDACTED]')
      .replace(/key[=:]\s*\S+/gi, 'key=[REDACTED]');

    return redacted;
  }

  /**
   * Validate command arguments
   */
  validateCommandArgs(args) {
    if (!Array.isArray(args)) {
      throw new Error('Command arguments must be an array');
    }

    return args.map(arg => {
      if (typeof arg !== 'string') {
        throw new Error('All command arguments must be strings');
      }
      return this.sanitizeString(arg);
    });
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
    // Validate command and arguments
    this.validateCommand(command);
    const sanitizedArgs = this.validateCommandArgs(args);

      // Prepare execution options
      const execOptions = this.prepareExecutionOptions(options);
      execOptions.startTime = startTime; // Pass start time for duration calculation

      // Use process pool to limit concurrency
      const result = await this.processPool(() => 
        this.executeWithStreaming(command, sanitizedArgs, execOptions)
      );

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
   * Prepare execution options with security hardening
   */
  prepareExecutionOptions(options) {
    const defaultOptions = {
      cwd: process.cwd(),
      env: this.sanitizeEnvironment(process.env), // Sanitize environment
      stdio: 'pipe',
      timeout: this.getTimeoutForOperation(options.operation), // Operation-specific timeouts
      maxBuffer: 1024 * 1024 * 10 // 10MB
    };

    // Merge with provided options
    const execOptions = { ...defaultOptions, ...options };

    // Sanitize additional environment variables
    if (options.env) {
      execOptions.env = { 
        ...execOptions.env, 
        ...this.sanitizeEnvironment(options.env) 
      };
    }

    return execOptions;
  }

  /**
   * Get appropriate timeout for operation type
   */
  getTimeoutForOperation(operation) {
    const timeouts = {
      'prove': 600000,    // 10 minutes for proof generation
      'build': 120000,    // 2 minutes for build
      'run': 120000,      // 2 minutes for execution
      'verify': 60000,    // 1 minute for verification
      'default': 300000   // 5 minutes default
    };
    
    return timeouts[operation] || timeouts.default;
  }

  /**
   * Run command with spawn and improved process lifecycle
   */
  async runCommand(command, args, options) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, options);
      
      let stdout = '';
      let stderr = '';
      let killed = false;
      let sigtermSent = false;

      // Security: Improved timeout handling with SIGTERM → SIGKILL escalation
      const timeout = setTimeout(() => {
        if (!killed) {
          killed = true;
          this.terminateProcess(child, sigtermSent);
          reject(new Error(`Command timed out after ${options.timeout}ms`));
        }
      }, options.timeout);

      // Security: Force kill after additional 30 seconds if SIGTERM doesn't work
      const forceKillTimeout = setTimeout(() => {
        if (!killed && sigtermSent) {
          killed = true;
          child.kill('SIGKILL');
        }
      }, options.timeout + 30000);

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
        clearTimeout(forceKillTimeout);
        
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
        clearTimeout(forceKillTimeout);
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
   * Terminate process with SIGTERM → SIGKILL escalation
   * Handles process groups to kill child processes (Windows-compatible)
   */
  terminateProcess(child, sigtermSent) {
    try {
      if (process.platform === 'win32') {
        // Windows: Kill child and its children explicitly
        this.killProcessTree(child.pid, sigtermSent ? 'SIGKILL' : 'SIGTERM');
      } else {
        // Unix: Kill process group (negative PID)
        if (!sigtermSent) {
          if (child.pid) {
            process.kill(-child.pid, 'SIGTERM');
          } else {
            child.kill('SIGTERM');
          }
          sigtermSent = true;
        } else {
          // Force kill process group
          if (child.pid) {
            process.kill(-child.pid, 'SIGKILL');
          } else {
            child.kill('SIGKILL');
          }
        }
      }
    } catch (error) {
      // Fallback to killing just the child if process group kill fails
      try {
        child.kill(sigtermSent ? 'SIGKILL' : 'SIGTERM');
      } catch (fallbackError) {
        console.warn(`Failed to terminate process ${child.pid}: ${fallbackError.message}`);
      }
    }
  }

  /**
   * Windows-compatible process tree termination
   * @param {number} pid - Process ID to terminate
   * @param {string} signal - Signal to send
   */
  killProcessTree(pid, signal) {
    if (process.platform !== 'win32') {
      // On Unix, use process group kill
      process.kill(-pid, signal);
      return;
    }

    // Windows: Use taskkill to terminate process tree
    const { spawn } = require('child_process');
    const taskkill = spawn('taskkill', ['/PID', pid.toString(), '/T', '/F'], {
      stdio: 'pipe'
    });

    taskkill.on('error', (error) => {
      console.warn(`Failed to kill process tree for PID ${pid}: ${error.message}`);
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
      const startTime = options.startTime || Date.now();
      const child = spawn(command, args, {
        ...this.prepareExecutionOptions(options),
        stdio: ['inherit', 'pipe', 'pipe'],
        detached: true  // Create new process group for proper cleanup
      });

      // Note: Not calling unref() because we want to capture logs and wait for completion

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
          stderr: stderr.trim(),
          duration: Date.now() - startTime
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
