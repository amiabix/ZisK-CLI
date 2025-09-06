/**
 * System Detection Module
 * Dynamically detects ZisK installation paths and system configuration
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

class SystemDetector {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Dynamically detect ZisK installation paths
   */
  async detectZiskInstallation() {
    if (this.cache.has('ziskInstallation')) {
      return this.cache.get('ziskInstallation');
    }

    const installation = await this.findZiskInstallation();
    this.cache.set('ziskInstallation', installation);
    return installation;
  }

  /**
   * Find ZisK installation by checking multiple possible locations
   */
  async findZiskInstallation() {
    const possiblePaths = [
      // Standard ZisK installation
      '/Users/abix/.zisk/bin/cargo-zisk',
      // Alternative locations
      '/usr/local/bin/cargo-zisk',
      '/opt/zisk/bin/cargo-zisk',
      // From PATH
      ...this.getPathsFromEnvironment()
    ];

    for (const cargoZiskPath of possiblePaths) {
      if (await fs.pathExists(cargoZiskPath)) {
        const baseDir = path.dirname(cargoZiskPath);
        const ziskBase = path.dirname(baseDir);
        
        return {
          base: ziskBase,
          bin: baseDir,
          cargoZisk: cargoZiskPath,
          ziskemu: path.join(baseDir, 'ziskemu'),
          witnessLib: this.getWitnessLibraryPath(baseDir),
          provingKey: path.join(ziskBase, 'provingKey'),
          config: path.join(ziskBase, 'config.json')
        };
      }
    }

    throw new Error('ZisK installation not found. Please install ZisK first.');
  }

  /**
   * Get paths from environment PATH variable
   */
  getPathsFromEnvironment() {
    const pathEnv = process.env.PATH || '';
    return pathEnv.split(':')
      .map(p => path.join(p, 'cargo-zisk'))
      .filter(p => p !== 'cargo-zisk'); // Remove empty paths
  }

  /**
   * Get witness library path based on platform
   */
  getWitnessLibraryPath(binDir) {
    const platform = process.platform;
    if (platform === 'darwin') {
      return path.join(binDir, 'libzisk_witness.dylib');
    } else if (platform === 'linux') {
      return path.join(binDir, 'libzisk_witness.so');
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Detect ZisK version
   */
  async detectZiskVersion() {
    try {
      const installation = await this.detectZiskInstallation();
      const output = execSync(`${installation.cargoZisk} --version`, { encoding: 'utf8' });
      const versionMatch = output.match(/cargo-zisk\s+([^\s]+)/);
      return versionMatch ? versionMatch[1] : 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Verify ZisK installation
   */
  async verifyInstallation() {
    const installation = await this.detectZiskInstallation();
    const checks = {
      cargoZisk: await fs.pathExists(installation.cargoZisk),
      ziskemu: await fs.pathExists(installation.ziskemu),
      witnessLib: await fs.pathExists(installation.witnessLib),
      provingKey: await fs.pathExists(installation.provingKey)
    };

    const allGood = Object.values(checks).every(Boolean);
    return { installation, checks, valid: allGood };
  }

  /**
   * Get system information
   */
  async getSystemInfo() {
    const installation = await this.detectZiskInstallation();
    const version = await this.detectZiskVersion();
    
    return {
      installation,
      version,
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version
    };
  }
}

module.exports = { SystemDetector };
