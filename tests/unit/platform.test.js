/**
 * Unit tests for Platform Manager
 */

const { PlatformManager } = require('../../src/platform');

describe('PlatformManager', () => {
  let platformManager;

  beforeEach(() => {
    platformManager = new PlatformManager();
  });

  describe('detectPlatform', () => {
    test('should detect platform information', () => {
      const platform = platformManager.platform;
      
      expect(platform).toBeDefined();
      expect(platform.name).toBeDefined();
      expect(platform.arch).toBeDefined();
      expect(platform.key).toBeDefined();
    });

    test('should set platform flags correctly', () => {
      const platform = platformManager.platform;
      
      expect(typeof platform.isLinux).toBe('boolean');
      expect(typeof platform.isMacOS).toBe('boolean');
      expect(typeof platform.isWindows).toBe('boolean');
      expect(typeof platform.isX64).toBe('boolean');
      expect(typeof platform.isArm64).toBe('boolean');
    });
  });

  describe('detectCapabilities', () => {
    test('should detect platform capabilities', () => {
      const capabilities = platformManager.capabilities;
      
      expect(capabilities).toBeDefined();
      expect(typeof capabilities.asmRunner).toBe('boolean');
      expect(typeof capabilities.mpiSupport).toBe('boolean');
      expect(typeof capabilities.gpuSupport).toBe('boolean');
      expect(typeof capabilities.fullZiskSupport).toBe('boolean');
    });
  });

  describe('isSupported', () => {
    test('should return boolean for platform support', () => {
      const isSupported = platformManager.isSupported();
      expect(typeof isSupported).toBe('boolean');
    });
  });

  describe('getPlatformInfo', () => {
    test('should return platform information string', () => {
      const info = platformManager.getPlatformInfo();
      expect(typeof info).toBe('string');
      expect(info.length).toBeGreaterThan(0);
    });
  });

  describe('getExecutionMode', () => {
    test('should return valid execution mode', () => {
      const mode = platformManager.getExecutionMode();
      expect(['asm', 'emulator']).toContain(mode);
    });
  });

  describe('getParallelismSettings', () => {
    test('should return parallelism settings', () => {
      const settings = platformManager.getParallelismSettings();
      
      expect(settings).toBeDefined();
      expect(typeof settings.processes).toBe('number');
      expect(typeof settings.threadsPerProcess).toBe('number');
      expect(typeof settings.totalThreads).toBe('number');
      
      expect(settings.processes).toBeGreaterThan(0);
      expect(settings.threadsPerProcess).toBeGreaterThan(0);
      expect(settings.totalThreads).toBeGreaterThan(0);
    });
  });

  describe('getSystemResources', () => {
    test('should return system resource information', () => {
      const resources = platformManager.getSystemResources();
      
      expect(resources).toBeDefined();
      expect(resources.memory).toBeDefined();
      expect(resources.cpu).toBeDefined();
      expect(resources.platform).toBeDefined();
      
      expect(typeof resources.memory.total).toBe('number');
      expect(typeof resources.memory.free).toBe('number');
      expect(typeof resources.cpu.count).toBe('number');
    });
  });

  describe('checkResourceRequirements', () => {
    test('should check resource requirements', () => {
      const requirements = platformManager.checkResourceRequirements();
      
      expect(requirements).toBeDefined();
      expect(typeof requirements.meets).toBe('boolean');
      expect(Array.isArray(requirements.issues)).toBe(true);
      expect(requirements.resources).toBeDefined();
      expect(requirements.requirements).toBeDefined();
    });
  });

  describe('resolveLibraryPaths', () => {
    test('should resolve library paths', () => {
      const paths = platformManager.resolveLibraryPaths();
      
      expect(paths).toBeDefined();
      expect(paths.witnessLibrary).toBeDefined();
      expect(paths.cargoZisk).toBeDefined();
      expect(paths.ziskemu).toBeDefined();
      
      expect(typeof paths.witnessLibrary).toBe('string');
      expect(typeof paths.cargoZisk).toBe('string');
      expect(typeof paths.ziskemu).toBe('string');
    });
  });

  describe('getBuildFlags', () => {
    test('should return build flags array', () => {
      const flags = platformManager.getBuildFlags();
      expect(Array.isArray(flags)).toBe(true);
    });
  });

  describe('validateForOperation', () => {
    test('should validate operations for platform', () => {
      const operations = [
        'asm-execution',
        'mpi-execution', 
        'gpu-execution',
        'native-compilation',
        'parallel-execution'
      ];
      
      operations.forEach(operation => {
        try {
          const result = platformManager.validateForOperation(operation);
          expect(typeof result).toBe('boolean');
        } catch (error) {
          // Some operations may not be supported on all platforms
          expect(error.message).toContain('not supported');
        }
      });
    });
  });
});
