/**
 * Configuration Management System
 * Handles loading, validation, and management of CLI configuration
 */

const fs = require('fs-extra');
const path = require('path');
const { PlatformManager } = require('./platform');

class ConfigurationManager {
  constructor() {
    this.config = null;
    this.platform = new PlatformManager();
    this.configPath = null;
  }

  /**
   * Load configuration from multiple sources
   */
  async loadConfiguration(configPath = null) {
    try {
      // 1. Load from multiple sources
      const sources = [
        configPath ? this.loadFromFile(configPath) : null,
        this.loadFromCosmiconfig(),
        this.loadFromEnvironment(),
        this.getDefaults()
      ].filter(Boolean);

      // 2. Merge configurations (last wins)
      this.config = this.mergeConfigurations(sources);

      // 3. Apply platform-specific overrides
      this.applyPlatformOverrides();

      // 4. Validate configuration
      await this.validateConfiguration();

      // 5. Resolve paths and dependencies
      await this.resolveConfiguration();

      return this.config;
    } catch (error) {
      throw new Error(`Failed to load configuration: ${error.message}`);
    }
  }

  /**
   * Load configuration from cosmiconfig (disabled)
   */
  loadFromCosmiconfig() {
    // Cosmiconfig support removed for simplicity
    return null;
  }

  /**
   * Load configuration from environment variables
   */
  loadFromEnvironment() {
    const envConfig = {};

    // Map environment variables to config
    const envMapping = {
      'ZISK_DEV_PROJECT_NAME': 'project.name',
      'ZISK_DEV_PROJECT_VERSION': 'project.version',
      'ZISK_DEV_INPUT_DIR': 'inputs.directory',
      'ZISK_DEV_OUTPUT_DIR': 'outputs.directory',
      'ZISK_DEV_BUILD_PROFILE': 'build.profile',
      'ZISK_DEV_ZISK_PROVING_KEY': 'zisk.provingKey',
      'ZISK_DEV_ZISK_WITNESS_LIB': 'zisk.witnessLibrary',
      'ZISK_DEV_EXECUTION_MODE': 'zisk.executionMode',
      'ZISK_DEV_PARALLELISM': 'zisk.parallelism',
      'ZISK_DEV_MEMORY_LIMIT': 'zisk.memoryLimit',
      'ZISK_DEV_DEBUG': 'development.debug.enabled',
      'ZISK_DEV_VERBOSE': 'development.debug.level'
    };

    for (const [envVar, configPath] of Object.entries(envMapping)) {
      const value = process.env[envVar];
      if (value) {
        this.setNestedValue(envConfig, configPath, this.parseEnvValue(value));
      }
    }

    return envConfig;
  }

  /**
   * Get default configuration
   */
  getDefaults() {
    return {
      // Project settings
      project: {
        name: 'zisk-project',
        version: '1.0.0',
        zkvm: 'zisk'
      },

      // Input/Output configuration
      inputs: {
        directory: './inputs',
        formats: {
          '.json': 'json-serializer',
          '.yaml': 'yaml-serializer',
          '.yml': 'yaml-serializer',
          '.txt': 'text-serializer',
          '.bin': 'passthrough'
        },
        defaultInput: 'default.json'
      },

      outputs: {
        directory: './outputs',
        organize: true,
        keepLogs: true,
        compression: false
      },

      // Build configuration
      build: {
        profile: 'release',
        features: [],
        target: 'riscv64ima-zisk-zkvm-elf',
        useExistingBuildScript: true
      },

      // ZISK-specific settings
      zisk: {
        provingKey: null,
        witnessLibrary: null,
        executionMode: 'auto',
        parallelism: 'auto',
        memoryLimit: null,
        chunkSizeBits: null,
        unlockMappedMemory: false,
        saveProofs: true,
        verifyProofs: false
      },

      // Development settings
      development: {
        watch: {
          enabled: false,
          patterns: ['programs/**/*.rs', 'inputs/**/*'],
          debounce: 1000
        },

        debug: {
          enabled: false,
          level: 1,
          categories: [],
          keepTempFiles: false
        }
      },

      // Platform-specific overrides
      platform: {
        'darwin': {
          zisk: {
            executionMode: 'emulator'
          }
        },
        'linux-x64': {
          zisk: {
            executionMode: 'asm'
          }
        }
      }
    };
  }

  /**
   * Apply platform-specific overrides
   */
  applyPlatformOverrides() {
    const platformKey = this.platform.platform.key;
    const overrides = this.config.platform?.[platformKey];

    if (overrides) {
      this.config = this.mergeConfigurations([this.config, overrides]);
    }
  }

  /**
   * Validate configuration
   */
  async validateConfiguration() {
    const errors = [];

    // Validate paths exist
    if (this.config.inputs.directory && !fs.existsSync(this.config.inputs.directory)) {
      errors.push(`Input directory does not exist: ${this.config.inputs.directory}`);
    }

    // Validate ZISK paths
    if (this.config.zisk.provingKey && !fs.existsSync(this.config.zisk.provingKey)) {
      errors.push(`Proving key not found: ${this.config.zisk.provingKey}`);
    }

    // Validate platform compatibility
    const platformErrors = this.validatePlatformCompatibility();
    errors.push(...platformErrors);

    // Validate execution mode
    const executionMode = this.config.zisk.executionMode;
    if (executionMode !== 'auto' && !['asm', 'emulator'].includes(executionMode)) {
      errors.push(`Invalid execution mode: ${executionMode}`);
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Validate platform compatibility
   */
  validatePlatformCompatibility() {
    const errors = [];

    const executionMode = this.config.zisk.executionMode;
    
    if (executionMode === 'asm' && !this.platform.capabilities.asmRunner) {
      errors.push('ASM execution mode not supported on this platform');
    }

    if (executionMode === 'emulator' && !this.platform.capabilities.fullZiskSupport) {
      errors.push('Emulator execution mode not supported on this platform');
    }

    return errors;
  }

  /**
   * Resolve configuration paths and dependencies
   */
  async resolveConfiguration() {
    // Resolve ZISK paths
    if (!this.config.zisk.provingKey) {
      this.config.zisk.provingKey = this.platform.ziskPaths.provingKey;
    }

    if (!this.config.zisk.witnessLibrary) {
      const libPaths = this.platform.resolveLibraryPaths();
      this.config.zisk.witnessLibrary = libPaths.witnessLibrary;
    }

    // Resolve parallelism settings
    if (this.config.zisk.parallelism === 'auto') {
      const settings = this.platform.getParallelismSettings();
      this.config.zisk.parallelism = settings.processes;
    }

    // Resolve execution mode
    if (this.config.zisk.executionMode === 'auto') {
      this.config.zisk.executionMode = this.platform.getExecutionMode();
    }
  }

  /**
   * Get configuration value by path
   */
  get(path) {
    return this.getNestedValue(this.config, path);
  }

  /**
   * Set configuration value by path
   */
  set(path, value) {
    this.setNestedValue(this.config, path, value);
  }

  /**
   * Get nested object value by dot notation path
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Set nested object value by dot notation path
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key]) {
        current[key] = {};
      }
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Parse environment variable value
   */
  parseEnvValue(value) {
    // Try to parse as JSON
    try {
      return JSON.parse(value);
    } catch {
      // Try to parse as number
      if (!isNaN(value)) {
        return Number(value);
      }
      // Try to parse as boolean
      if (value.toLowerCase() === 'true') {
        return true;
      }
      if (value.toLowerCase() === 'false') {
        return false;
      }
      // Return as string
      return value;
    }
  }

  /**
   * Merge multiple configurations
   */
  mergeConfigurations(configs) {
    return configs.reduce((merged, config) => {
      return this.deepMerge(merged, config);
    }, {});
  }

  /**
   * Deep merge two objects
   */
  deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * Save configuration to file
   */
  async saveConfiguration(filePath = null) {
    const path = filePath || this.configPath || 'zisk-dev.config.js';
    
    const configContent = `module.exports = ${JSON.stringify(this.config, null, 2)};`;
    
    await fs.writeFile(path, configContent, 'utf8');
  }

  /**
   * Reset configuration to defaults
   */
  async resetConfiguration() {
    this.config = this.getDefaults();
    await this.saveConfiguration();
  }

  /**
   * Get configuration summary
   */
  getSummary() {
    return {
      project: this.config.project,
      inputs: {
        directory: this.config.inputs.directory,
        formats: Object.keys(this.config.inputs.formats)
      },
      outputs: {
        directory: this.config.outputs.directory
      },
      build: {
        profile: this.config.build.profile,
        target: this.config.build.target
      },
      zisk: {
        executionMode: this.config.zisk.executionMode,
        parallelism: this.config.zisk.parallelism,
        provingKey: this.config.zisk.provingKey ? 'set' : 'default'
      },
      development: {
        debug: this.config.development.debug.enabled,
        watch: this.config.development.watch.enabled
      }
    };
  }
}

module.exports = { ConfigurationManager };
