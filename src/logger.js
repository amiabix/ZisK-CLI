/**
 * Logging System
 * Handles structured logging with different levels and outputs
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');

class Logger {
  constructor() {
    this.level = 'info';
    this.verbose = false;
    this.loggers = new Map();
    this.logDir = path.join(process.cwd(), '.zisk-build', 'logs');
    
    // Ensure log directory exists
    fs.ensureDirSync(this.logDir);
  }

  /**
   * Set log level
   */
  setLevel(level) {
    this.level = level;
    this.updateLoggers();
  }

  /**
   * Set verbose mode
   */
  setVerbose(verbose) {
    this.verbose = verbose;
    this.updateLoggers();
  }

  /**
   * Get logger for specific category
   */
  getLogger(category = 'default') {
    if (!this.loggers.has(category)) {
      this.loggers.set(category, this.createLogger(category));
    }
    return this.loggers.get(category);
  }

  /**
   * Create winston logger instance
   */
  createLogger(category) {
    const logFile = path.join(this.logDir, `${category}.log`);
    
    const transports = [
      // File transport
      new winston.transports.File({
        filename: logFile,
        level: this.level,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        )
      })
    ];

    // Console transport for verbose mode or errors
    if (this.verbose || this.level === 'debug') {
      transports.push(
        new winston.transports.Console({
          level: this.level,
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp(),
            winston.format.printf(this.formatConsoleLog.bind(this))
          )
        })
      );
    }

    return winston.createLogger({
      level: this.level,
      transports,
      defaultMeta: { category }
    });
  }

  /**
   * Update all loggers with new settings
   */
  updateLoggers() {
    this.loggers.clear();
  }

  /**
   * Format console log output
   */
  formatConsoleLog(info) {
    const { timestamp, level, message, category, ...meta } = info;
    
    let formattedMessage = `${timestamp} [${level.toUpperCase()}]`;
    
    if (category && category !== 'default') {
      formattedMessage += ` [${category}]`;
    }
    
    formattedMessage += ` ${message}`;
    
    if (Object.keys(meta).length > 0) {
      formattedMessage += ` ${JSON.stringify(meta)}`;
    }
    
    return formattedMessage;
  }

  /**
   * Log info message
   */
  info(message, meta = {}) {
    this.getLogger().info(message, meta);
  }

  /**
   * Log warning message
   */
  warn(message, meta = {}) {
    this.getLogger().warn(message, meta);
  }

  /**
   * Log error message
   */
  error(message, error = null) {
    const meta = error ? {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code
      }
    } : {};
    
    this.getLogger().error(message, meta);
  }

  /**
   * Log debug message
   */
  debug(message, meta = {}) {
    this.getLogger().debug(message, meta);
  }

  /**
   * Log success message
   */
  success(message, meta = {}) {
    this.getLogger().info(`SUCCESS: ${message}`, meta);
  }

  /**
   * Log progress message
   */
  progress(message, meta = {}) {
    this.getLogger().info(`PROGRESS: ${message}`, meta);
  }

  /**
   * Log command execution
   */
  logCommand(command, args = [], options = {}) {
    // Show command execution on screen
    console.log(`[COMMAND] Executing: ${command} ${args.join(' ')}`);
    console.log(`[COMMAND] Working directory: ${process.cwd()}`);
    
    this.debug('Executing command', {
      command,
      args,
      options,
      cwd: process.cwd(),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log command result
   */
  logCommandResult(command, result) {
    const { exitCode, stdout, stderr, duration } = result;
    
    // Show command result on screen
    console.log(`[RESULT] Command completed with exit code: ${exitCode}`);
    console.log(`[RESULT] Duration: ${duration}ms`);
    
    if (stdout && stdout.trim()) {
      console.log(`[STDOUT] ${stdout}`);
    }
    
    if (stderr && stderr.trim()) {
      console.log(`[STDERR] ${stderr}`);
    }
    
    this.debug('Command completed', {
      command,
      exitCode,
      duration,
      stdoutLength: stdout?.length || 0,
      stderrLength: stderr?.length || 0
    });

    if (exitCode !== 0) {
      this.error(`Command failed with exit code ${exitCode}`, {
        command,
        stderr,
        exitCode
      });
    }
  }

  /**
   * Log file operation
   */
  logFileOperation(operation, filePath, meta = {}) {
    this.debug(`File ${operation}`, {
      operation,
      filePath,
      ...meta
    });
  }

  /**
   * Log performance metrics
   */
  logPerformance(operation, duration, meta = {}) {
    this.debug(`Performance: ${operation}`, {
      operation,
      duration,
      durationMs: duration,
      ...meta
    });
  }

  /**
   * Get log file path for category
   */
  getLogFilePath(category = 'default') {
    return path.join(this.logDir, `${category}.log`);
  }

  /**
   * Clear log files
   */
  async clearLogs() {
    try {
      await fs.emptyDir(this.logDir);
      this.info('Log files cleared');
    } catch (error) {
      this.error('Failed to clear log files', error);
    }
  }

  /**
   * Get log statistics
   */
  async getLogStats() {
    const stats = {};
    
    for (const [category, logger] of this.loggers) {
      const logFile = this.getLogFilePath(category);
      
      if (await fs.pathExists(logFile)) {
        const fileStats = await fs.stat(logFile);
        stats[category] = {
          size: fileStats.size,
          modified: fileStats.mtime,
          exists: true
        };
      } else {
        stats[category] = {
          exists: false
        };
      }
    }
    
    return stats;
  }

  /**
   * Format log level for display
   */
  formatLevel(level) {
    const colors = {
      error: chalk.red,
      warn: chalk.yellow,
      info: chalk.blue,
      debug: chalk.gray
    };
    
    return colors[level] ? colors[level](level.toUpperCase()) : level.toUpperCase();
  }

  /**
   * Create child logger with additional context
   */
  child(context) {
    const childLogger = new Logger();
    childLogger.level = this.level;
    childLogger.verbose = this.verbose;
    childLogger.logDir = this.logDir;
    
    // Add context to all log messages
    const originalInfo = childLogger.info.bind(childLogger);
    childLogger.info = (message, meta = {}) => {
      originalInfo(message, { ...context, ...meta });
    };
    
    return childLogger;
  }
}

module.exports = { Logger };
