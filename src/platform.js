/**
 * Platform Management System
 * Handles platform detection, capability assessment, and platform-specific adaptations
 */

const os = require('os');
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

class PlatformManager {
  constructor() {
    this.platform = this.detectPlatform();
    this.capabilities = this.detectCapabilities();
    this.ziskPaths = this.detectZiskPaths();
  }

  /**
   * Detect the current platform and architecture
   */
  detectPlatform() {
    const platform = os.platform();
    const arch = os.arch();
    const release = os.release();
    const hostname = os.hostname();

    return {
      name: platform,
      arch: arch,
      release: release,
      hostname: hostname,
      isLinux: platform === 'linux',
      isMacOS: platform === 'darwin',
      isWindows: platform === 'win32',
      isX64: arch === 'x64',
      isArm64: arch === 'arm64',
      isX86: arch === 'ia32',
      key: `${platform}-${arch}`
    };
  }

  /**
   * Detect platform capabilities for ZISK
   */
  detectCapabilities() {
    const capabilities = {
      asmRunner: false,
      mpiSupport: false,
      gpuSupport: false,
      fullZiskSupport: false,
      nativeCompilation: false,
      parallelExecution: false
    };

    // Linux x64 has full support
    if (this.platform.isLinux && this.platform.isX64) {
      capabilities.asmRunner = true;
      capabilities.mpiSupport = this.checkMPISupport();
      capabilities.gpuSupport = this.checkGPUSupport();
      capabilities.fullZiskSupport = true;
      capabilities.nativeCompilation = true;
      capabilities.parallelExecution = true;
    }

    // macOS has limited support (emulator only)
    if (this.platform.isMacOS) {
      capabilities.fullZiskSupport = true;
      capabilities.nativeCompilation = this.checkMacOSCompilation();
      capabilities.parallelExecution = true;
    }

    // Linux ARM64 has limited support
    if (this.platform.isLinux && this.platform.isArm64) {
      capabilities.fullZiskSupport = true;
      capabilities.nativeCompilation = true;
      capabilities.parallelExecution = true;
    }

    return capabilities;
  }

  /**
   * Check if MPI is available on the system
   */
  checkMPISupport() {
    try {
      execSync('which mpirun', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if GPU support is available
   */
  checkGPUSupport() {
    try {
      // Check for NVIDIA GPU
      execSync('nvidia-smi', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if native compilation is available on macOS
   */
  checkMacOSCompilation() {
    try {
      execSync('xcode-select -p', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Detect ZISK installation paths
   */
  detectZiskPaths() {
    const homeDir = os.homedir();
    const basePath = path.join(homeDir, '.zisk');

    return {
      base: basePath,
      bin: path.join(basePath, 'bin'),
      provingKey: path.join(basePath, 'provingKey'),
      cache: path.join(basePath, 'cache'),
      toolchains: path.join(basePath, 'toolchains'),
      logs: path.join(basePath, 'logs'),
      config: path.join(basePath, 'config.json')
    };
  }

  /**
   * Check if the platform is supported
   */
  isSupported() {
    return this.capabilities.fullZiskSupport;
  }

  /**
   * Get platform information for display
   */
  getPlatformInfo() {
    return `${this.platform.name} ${this.platform.arch} (${this.platform.release})`;
  }

  /**
   * Get execution mode for ZISK
   */
  getExecutionMode() {
    if (this.capabilities.asmRunner) {
      return 'asm';
    } else if (this.capabilities.fullZiskSupport) {
      return 'emulator';
    } else {
      throw new Error('ZISK not supported on this platform');
    }
  }

  /**
   * Get recommended parallelism settings
   */
  getParallelismSettings() {
    const cpuCount = os.cpus().length;
    
    return {
      processes: Math.max(1, Math.floor(cpuCount / 2)),
      threadsPerProcess: Math.max(1, Math.floor(cpuCount / 4)),
      totalThreads: cpuCount
    };
  }

  /**
   * Get system resource information
   */
  getSystemResources() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const loadAvg = os.loadavg();

    return {
      memory: {
        total: totalMem,
        free: freeMem,
        used: totalMem - freeMem,
        usagePercent: ((totalMem - freeMem) / totalMem) * 100
      },
      cpu: {
        count: os.cpus().length,
        loadAverage: loadAvg,
        uptime: os.uptime()
      },
      platform: {
        hostname: os.hostname(),
        type: os.type(),
        release: os.release()
      }
    };
  }

  /**
   * Check if system has sufficient resources for ZISK
   */
  checkResourceRequirements() {
    const resources = this.getSystemResources();
    const requirements = {
      minMemory: 8 * 1024 * 1024 * 1024, // 8GB
      recommendedMemory: 16 * 1024 * 1024 * 1024, // 16GB
      minCores: 4,
      recommendedCores: 8
    };

    const issues = [];

    if (resources.memory.total < requirements.minMemory) {
      issues.push(`Insufficient memory: ${Math.round(resources.memory.total / 1024 / 1024 / 1024)}GB available, ${Math.round(requirements.minMemory / 1024 / 1024 / 1024)}GB required`);
    }

    if (resources.cpu.count < requirements.minCores) {
      issues.push(`Insufficient CPU cores: ${resources.cpu.count} available, ${requirements.minCores} required`);
    }

    return {
      meets: issues.length === 0,
      issues,
      resources,
      requirements
    };
  }

  /**
   * Get platform-specific command adaptations
   */
  getCommandAdaptations() {
    const adaptations = {
      env: {},
      args: [],
      limitations: []
    };

    if (this.platform.isMacOS) {
      adaptations.limitations.push('ASM runner not available - using emulator mode');
      adaptations.limitations.push('MPI support not available');
      adaptations.limitations.push('GPU support not available');
    }

    if (this.platform.isLinux && this.platform.isArm64) {
      adaptations.limitations.push('ASM runner not available - using emulator mode');
      adaptations.limitations.push('MPI support not available');
      adaptations.limitations.push('GPU support not available');
    }

    return adaptations;
  }

  /**
   * Resolve library paths for the current platform
   */
  resolveLibraryPaths() {
    const basePath = this.ziskPaths.bin;

    return {
      witnessLibrary: this.platform.isLinux 
        ? path.join(basePath, 'libzisk_witness.so')
        : path.join(basePath, 'libzisk_witness.dylib'),
      cargoZisk: path.join(basePath, 'cargo-zisk'),
      ziskemu: path.join(basePath, 'ziskemu')
    };
  }

  /**
   * Get platform-specific build flags
   */
  getBuildFlags() {
    const flags = [];

    // Note: --emulator flag is not supported by cargo-zisk build
    // Platform-specific execution mode is handled elsewhere

    if (this.capabilities.gpuSupport) {
      flags.push('--features', 'gpu');
    }

    return flags;
  }

  /**
   * Validate platform for specific operation
   */
  validateForOperation(operation) {
    const requirements = {
      'asm-execution': this.capabilities.asmRunner,
      'mpi-execution': this.capabilities.mpiSupport,
      'gpu-execution': this.capabilities.gpuSupport,
      'native-compilation': this.capabilities.nativeCompilation,
      'parallel-execution': this.capabilities.parallelExecution
    };

    if (!requirements[operation]) {
      throw new Error(`Operation '${operation}' not supported on this platform`);
    }

    return true;
  }
}

module.exports = { PlatformManager };
