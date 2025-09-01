/**
 * Error Handling System
 * Provides structured error handling and recovery mechanisms
 */

class ZiskError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = this.constructor.name;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.code = context.code || 'UNKNOWN_ERROR';
  }

  /**
   * Get formatted error message
   */
  getFormattedMessage() {
    return `${this.name}: ${this.message}`;
  }

  /**
   * Get error context for debugging
   */
  getContext() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp,
      context: this.context
    };
  }
}

class SystemError extends ZiskError {
  constructor(message, context = {}) {
    super(message, { ...context, code: 'SYSTEM_ERROR' });
  }
}

class ConfigurationError extends ZiskError {
  constructor(message, context = {}) {
    super(message, { ...context, code: 'CONFIGURATION_ERROR' });
  }
}

class BuildError extends ZiskError {
  constructor(message, context = {}) {
    super(message, { ...context, code: 'BUILD_ERROR' });
  }
}

class ExecutionError extends ZiskError {
  constructor(message, context = {}) {
    super(message, { ...context, code: 'EXECUTION_ERROR' });
  }
}

class ProvingError extends ZiskError {
  constructor(message, context = {}) {
    super(message, { ...context, code: 'PROVING_ERROR' });
  }
}

class NetworkError extends ZiskError {
  constructor(message, context = {}) {
    super(message, { ...context, code: 'NETWORK_ERROR' });
  }
}

class PlatformError extends ZiskError {
  constructor(message, context = {}) {
    super(message, { ...context, code: 'PLATFORM_ERROR' });
  }
}

class ValidationError extends ZiskError {
  constructor(message, context = {}) {
    super(message, { ...context, code: 'VALIDATION_ERROR' });
  }
}

/**
 * Error Context Collector
 * Collects comprehensive context information for error reporting
 */
class ErrorContextCollector {
  constructor() {
    this.context = {};
  }

  /**
   * Collect comprehensive error context
   */
  async collectContext(error, command, options) {
    const context = {
      // Error details
      error: {
        message: error.message,
        stack: error.stack,
        type: error.constructor.name,
        code: error.code || 'UNKNOWN_ERROR'
      },

      // Command context
      command: {
        name: command?.name,
        args: command?.args || [],
        options: options || {},
        workingDirectory: process.cwd(),
        startTime: command?.startTime,
        duration: command?.startTime ? Date.now() - command.startTime : null
      },

      // System context
      system: await this.collectSystemContext(),

      // File system context
      files: await this.collectFileContext(),

      // Process context
      process: this.collectProcessContext()
    };

    return context;
  }

  /**
   * Collect system context information
   */
  async collectSystemContext() {
    const os = require('os');
    
    return {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      memory: process.memoryUsage(),
      uptime: os.uptime(),
      loadavg: os.loadavg(),
      freemem: os.freemem(),
      totalmem: os.totalmem(),
      cpus: os.cpus().length
    };
  }

  /**
   * Collect file system context
   */
  async collectFileContext() {
    const fs = require('fs-extra');
    const path = require('path');
    
    const files = {
      expected: [],
      actual: [],
      missing: [],
      unexpected: []
    };

    // Check expected files exist
    const expectedFiles = this.getExpectedFiles();
    for (const filePath of expectedFiles) {
      if (await fs.pathExists(filePath)) {
        const stats = await fs.stat(filePath);
        files.actual.push({
          path: filePath,
          size: stats.size,
          mtime: stats.mtime,
          mode: stats.mode
        });
      } else {
        files.missing.push(filePath);
      }
    }

    return files;
  }

  /**
   * Get list of expected files for current project
   */
  getExpectedFiles() {
    const expectedFiles = [
      'Cargo.toml',
      'src/main.rs',
      'inputs/',
      'outputs/'
    ];

    // Add platform-specific files
    const { PlatformManager } = require('./platform');
    const platform = new PlatformManager();
    
    if (platform.ziskPaths) {
      expectedFiles.push(
        platform.ziskPaths.provingKey,
        platform.ziskPaths.bin
      );
    }

    return expectedFiles;
  }

  /**
   * Collect process context information
   */
  collectProcessContext() {
    return {
      pid: process.pid,
      ppid: process.ppid,
      argv: process.argv,
      env: this.getRelevantEnv(),
      cwd: process.cwd(),
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
  }

  /**
   * Get relevant environment variables
   */
  getRelevantEnv() {
    const relevantVars = [
      'PATH',
      'HOME',
      'USER',
      'SHELL',
      'NODE_ENV',
      'ZISK_DEV_DEBUG',
      'ZISK_DEV_VERBOSE'
    ];

    const env = {};
    for (const varName of relevantVars) {
      if (process.env[varName]) {
        env[varName] = process.env[varName];
      }
    }

    return env;
  }
}

/**
 * Error Recovery Manager
 * Handles error recovery and cleanup operations
 */
class RecoveryManager {
  constructor() {
    this.cleanupTasks = [];
    this.snapshots = new Map();
  }

  /**
   * Register cleanup task
   */
  registerCleanupTask(task) {
    this.cleanupTasks.push(task);
  }

  /**
   * Create system snapshot
   */
  async createSnapshot(name) {
    const snapshot = {
      timestamp: Date.now(),
      files: await this.captureFileState(),
      processes: await this.captureProcessState(),
      environment: process.env
    };

    this.snapshots.set(name, snapshot);
  }

  /**
   * Capture current file state
   */
  async captureFileState() {
    const fs = require('fs-extra');
    const path = require('path');
    
    const files = {};
    const directories = ['.zisk-build', 'outputs', 'inputs'];

    for (const dir of directories) {
      if (await fs.pathExists(dir)) {
        const stats = await fs.stat(dir);
        files[dir] = {
          exists: true,
          size: stats.size,
          mtime: stats.mtime
        };
      } else {
        files[dir] = { exists: false };
      }
    }

    return files;
  }

  /**
   * Capture current process state
   */
  async captureProcessState() {
    const { execSync } = require('child_process');
    
    try {
      const processes = execSync('ps aux | grep zisk', { encoding: 'utf8' });
      return processes.split('\n').filter(line => line.trim());
    } catch {
      return [];
    }
  }

  /**
   * Attempt recovery from failure
   */
  async recoverFromFailure(error) {
    console.log('Attempting recovery from failure...');

    // 1. Stop any running processes
    await this.killBackgroundProcesses();

    // 2. Clean up temporary files
    await this.runCleanupTasks();

    // 3. Check if we can retry
    const canRetry = await this.assessRetryViability(error);

    if (canRetry) {
      console.log('Recovery suggestions:');
      const suggestions = this.generateRecoverySuggestions(error);
      suggestions.forEach(suggestion => {
        console.log(`   - ${suggestion}`);
      });
    }

    return canRetry;
  }

  /**
   * Kill background processes
   */
  async killBackgroundProcesses() {
    const { execSync } = require('child_process');
    
    try {
      // Kill any running zisk processes
      execSync('pkill -f zisk', { stdio: 'ignore' });
    } catch {
      // Ignore errors if no processes found
    }
  }

  /**
   * Run registered cleanup tasks
   */
  async runCleanupTasks() {
    for (const task of this.cleanupTasks) {
      try {
        await task();
      } catch (error) {
        console.error('Cleanup task failed:', error.message);
      }
    }
  }

  /**
   * Assess if retry is viable
   */
  async assessRetryViability(error) {
    // Check if error is retryable
    const retryableErrors = [
      'NETWORK_ERROR',
      'TEMPORARY_FAILURE',
      'RESOURCE_UNAVAILABLE'
    ];

    if (retryableErrors.includes(error.code)) {
      return true;
    }

    // Check system resources
    const os = require('os');
    const freeMem = os.freemem();
    const minMemory = 2 * 1024 * 1024 * 1024; // 2GB

    if (freeMem < minMemory) {
      return false;
    }

    return true;
  }

  /**
   * Generate recovery suggestions
   */
  generateRecoverySuggestions(error) {
    const suggestions = [];

    switch (error.code) {
      case 'NETWORK_ERROR':
        suggestions.push('Check internet connection');
        suggestions.push('Verify ZISK repository accessibility');
        suggestions.push('Try using a different network');
        break;

      case 'BUILD_ERROR':
        suggestions.push('Clean build artifacts: zisk-dev clean');
        suggestions.push('Check Rust toolchain: rustup show');
        suggestions.push('Verify Cargo.toml configuration');
        break;

      case 'EXECUTION_ERROR':
        suggestions.push('Check input file format');
        suggestions.push('Verify ZISK installation: zisk-dev doctor');
        suggestions.push('Try with smaller input data');
        break;

      case 'PROVING_ERROR':
        suggestions.push('Check available memory');
        suggestions.push('Verify proving key installation');
        suggestions.push('Try with reduced parallelism');
        break;

      case 'SYSTEM_ERROR':
        suggestions.push('Check system resources');
        suggestions.push('Verify platform compatibility');
        suggestions.push('Restart terminal/IDE');
        break;

      default:
        suggestions.push('Check logs for detailed error information');
        suggestions.push('Run system diagnostics: zisk-dev doctor');
        suggestions.push('Consider reinstalling ZISK: zisk-dev install --force');
    }

    return suggestions;
  }
}

/**
 * Error Handler
 * Main error handling interface
 */
class ErrorHandler {
  constructor() {
    this.contextCollector = new ErrorContextCollector();
    this.recoveryManager = new RecoveryManager();
  }

  /**
   * Handle error with comprehensive context collection
   */
  async handleError(error, command = null, options = {}) {
    // Collect error context
    const context = await this.contextCollector.collectContext(error, command, options);

    // Log error with context
    const { Logger } = require('./logger');
    const logger = new Logger();
    logger.error(error.message, error);

    // Attempt recovery
    const canRetry = await this.recoveryManager.recoverFromFailure(error);

    // Return error context for further handling
    return {
      error,
      context,
      canRetry,
      suggestions: this.recoveryManager.generateRecoverySuggestions(error)
    };
  }

  /**
   * Create error from context
   */
  createError(type, message, context = {}) {
    const errorClasses = {
      SystemError,
      ConfigurationError,
      BuildError,
      ExecutionError,
      ProvingError,
      NetworkError,
      PlatformError,
      ValidationError
    };

    const ErrorClass = errorClasses[type] || ZiskError;
    return new ErrorClass(message, context);
  }

  /**
   * Validate error is handled
   */
  isHandled(error) {
    return error instanceof ZiskError;
  }

  /**
   * Get error type from standard error
   */
  classifyError(error) {
    if (error.code === 'ENOENT') {
      return 'SystemError';
    }
    if (error.code === 'EACCES') {
      return 'SystemError';
    }
    if (error.message.includes('network')) {
      return 'NetworkError';
    }
    if (error.message.includes('build')) {
      return 'BuildError';
    }
    if (error.message.includes('execution')) {
      return 'ExecutionError';
    }
    if (error.message.includes('proof')) {
      return 'ProvingError';
    }
    
    return 'SystemError';
  }
}

module.exports = {
  ZiskError,
  SystemError,
  ConfigurationError,
  BuildError,
  ExecutionError,
  ProvingError,
  NetworkError,
  PlatformError,
  ValidationError,
  ErrorContextCollector,
  RecoveryManager,
  ErrorHandler
};
