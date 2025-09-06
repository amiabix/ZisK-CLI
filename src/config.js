/**
 * Configuration Management System
 * Handles .env file overrides for project discovery
 */

const fs = require('fs-extra');
const path = require('path');
const { SystemDetector } = require('./system');
const { ProjectDiscoverer } = require('./project');

class ConfigurationManager {
  constructor() {
    this.systemDetector = new SystemDetector();
    this.projectDiscoverer = new ProjectDiscoverer();
    this.cache = new Map();
    this.cacheTimestamps = new Map(); // Security: Track cache timestamps for invalidation
  }

  /**
   * Load complete configuration (system + project + .env overrides)
   */
  async loadConfiguration(projectRoot = process.cwd()) {
    const cacheKey = projectRoot;
    
    // Security: Check cache validity by mtime
    if (this.cache.has(cacheKey) && this.isCacheValid(projectRoot)) {
      return this.cache.get(cacheKey);
    }

    try {
      // 1. Detect system paths dynamically
      const systemInfo = await this.systemDetector.getSystemInfo();
      
      // 2. Discover project details using hardcoded logic
      const projectInfo = await this.projectDiscoverer.discoverProject(projectRoot);
      
      // 3. Load .env overrides if they exist
      const envOverrides = await this.loadEnvOverrides(projectRoot);
      
      // 4. Merge everything together
      const config = {
        // System paths (dynamically detected)
        system: systemInfo,
        
        // Project details (hardcoded discovery + .env overrides)
        project: {
          ...projectInfo,
          ...envOverrides
        },
        
        // Convenience properties for easy access
        projectName: envOverrides.PROJECT_NAME || projectInfo.name,
        inputDirectory: envOverrides.INPUT_DIRECTORY || projectInfo.inputFiles.length > 0 ? path.dirname(projectInfo.inputFiles[0]) : './inputs',
        outputDirectory: envOverrides.OUTPUT_DIRECTORY || projectInfo.outputDirectory,
        buildTarget: envOverrides.BUILD_TARGET || projectInfo.buildTarget,
        buildProfile: envOverrides.BUILD_PROFILE || projectInfo.buildProfile,
        buildFeatures: envOverrides.BUILD_FEATURES || projectInfo.features,
        
        // System paths for easy access
        cargoZiskPath: systemInfo.installation.cargoZisk,
        ziskemuPath: systemInfo.installation.ziskemu,
        witnessLibPath: systemInfo.installation.witnessLib,
        provingKeyPath: systemInfo.installation.provingKey
      };

      this.cache.set(cacheKey, config);
      this.cacheTimestamps.set(cacheKey, Date.now()); // Security: Record cache timestamp
      return config;
    } catch (error) {
      throw new Error(`Failed to load configuration: ${error.message}`);
    }
  }

  /**
   * Load .env file overrides
   */
  async loadEnvOverrides(projectRoot) {
    const envPath = path.join(projectRoot, '.env');
    
    if (!await fs.pathExists(envPath)) {
      return {};
    }

    try {
      const envContent = await fs.readFile(envPath, 'utf8');
      const overrides = {};
      
      // Parse .env file
      const lines = envContent.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Skip comments and empty lines
        if (trimmedLine.startsWith('#') || trimmedLine === '') {
          continue;
        }
        
        // Parse KEY=VALUE pairs
        const equalIndex = trimmedLine.indexOf('=');
        if (equalIndex > 0) {
          const key = trimmedLine.substring(0, equalIndex).trim();
          const value = trimmedLine.substring(equalIndex + 1).trim();
          
          // Remove quotes if present
          const cleanValue = value.replace(/^['"]|['"]$/g, '');
          overrides[key] = cleanValue;
        }
      }
      
      return overrides;
    } catch (error) {
      console.warn(`Warning: Could not parse .env file: ${error.message}`);
      return {};
    }
  }

  /**
   * Create .env file template
   */
  async createEnvTemplate(projectRoot) {
    const projectInfo = await this.projectDiscoverer.discoverProject(projectRoot);
    
    const envContent = `# ZisK Project Configuration
# This file contains optional overrides for project discovery

# Project Configuration
PROJECT_NAME=${projectInfo.name}
INPUT_DIRECTORY=./inputs
OUTPUT_DIRECTORY=./proofs

# Build Configuration
BUILD_TARGET=${projectInfo.buildTarget}
BUILD_PROFILE=${projectInfo.buildProfile}
BUILD_FEATURES=${projectInfo.features || ''}

# Execution Configuration
EXECUTION_MAX_STEPS=1000000
EXECUTION_MEMORY_LIMIT=8GB

# Note: System paths are auto-detected and don't need to be configured here
`;

    const envPath = path.join(projectRoot, '.env');
    await fs.writeFile(envPath, envContent);
    return envPath;
  }

  /**
   * Check if cache is still valid based on file modification times and content hash
   */
  isCacheValid(projectRoot) {
    try {
      const cacheKey = projectRoot;
      const cacheTime = this.cacheTimestamps.get(cacheKey);
      if (!cacheTime) return false;

      // Check if key files have been modified since cache
      const keyFiles = [
        path.join(projectRoot, '.env'),
        path.join(projectRoot, 'Cargo.toml'),
        path.join(projectRoot, 'package.json')
      ];

      for (const file of keyFiles) {
        if (fs.existsSync(file)) {
          const stats = fs.statSync(file);
          if (stats.mtime.getTime() > cacheTime) {
            return false; // File modified after cache
          }
          
          // Also check content hash for binaries where mtime can be preserved
          if (file.endsWith('.toml') || file.endsWith('.json')) {
            const content = fs.readFileSync(file, 'utf8');
            const contentHash = this.getContentHash(content);
            const cachedHash = this.cacheContentHashes?.get(file);
            
            if (cachedHash && cachedHash !== contentHash) {
              return false; // Content changed even if mtime didn't
            }
            
            // Store current hash
            if (!this.cacheContentHashes) {
              this.cacheContentHashes = new Map();
            }
            this.cacheContentHashes.set(file, contentHash);
          }
        }
      }

      return true;
    } catch (error) {
      return false; // If we can't check, invalidate cache
    }
  }

  /**
   * Generate content hash for cache invalidation
   * @param {string} content - File content
   * @returns {string} Content hash
   */
  getContentHash(content) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    this.cacheTimestamps.clear(); // Clear timestamps too
    if (this.cacheContentHashes) {
      this.cacheContentHashes.clear();
    }
  }

  /**
   * Get configuration for a specific project
   */
  async getProjectConfig(projectRoot = process.cwd()) {
    return await this.loadConfiguration(projectRoot);
  }
}

// Convenience function for backward compatibility
async function loadProjectConfig(projectRoot = process.cwd()) {
  const configManager = new ConfigurationManager();
  const config = await configManager.loadConfiguration(projectRoot);
  return config.project;
}

module.exports = { ConfigurationManager, loadProjectConfig };