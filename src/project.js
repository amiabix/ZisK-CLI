/**
 * Project Discovery Module
 * Hardcoded logic to discover project details from Cargo.toml and file system
 */

const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');

class ProjectDiscoverer {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Discover project information using hardcoded logic
   */
  async discoverProject(projectRoot = process.cwd()) {
    if (this.cache.has(projectRoot)) {
      return this.cache.get(projectRoot);
    }

    const project = {
      root: projectRoot,
      name: await this.discoverProjectName(projectRoot),
      mainFile: await this.discoverMainFile(projectRoot),
      inputFiles: await this.discoverInputFiles(projectRoot),
      outputDirectory: await this.discoverOutputDirectory(projectRoot),
      buildTarget: await this.discoverBuildTarget(projectRoot),
      buildProfile: await this.discoverBuildProfile(projectRoot),
      features: await this.discoverFeatures(projectRoot)
    };

    this.cache.set(projectRoot, project);
    return project;
  }

  /**
   * Discover project name from Cargo.toml
   */
  async discoverProjectName(projectRoot) {
    const cargoTomlPath = path.join(projectRoot, 'Cargo.toml');
    
    if (!await fs.pathExists(cargoTomlPath)) {
      // Fallback to directory name
      return path.basename(projectRoot);
    }

    try {
      const cargoContent = await fs.readFile(cargoTomlPath, 'utf8');
      const nameMatch = cargoContent.match(/name\s*=\s*"([^"]+)"/);
      return nameMatch ? nameMatch[1] : path.basename(projectRoot);
    } catch (error) {
      return path.basename(projectRoot);
    }
  }

  /**
   * Discover main file using hardcoded logic
   */
  async discoverMainFile(projectRoot) {
    const possibleMainFiles = [
      'src/main.rs',
      'src/lib.rs',
      'main.rs',
      'lib.rs'
    ];

    for (const mainFile of possibleMainFiles) {
      const fullPath = path.join(projectRoot, mainFile);
      if (await fs.pathExists(fullPath)) {
        return mainFile;
      }
    }

    return 'src/main.rs'; // Default fallback
  }

  /**
   * Discover input files using hardcoded logic
   */
  async discoverInputFiles(projectRoot) {
    const inputDirectories = [
      'inputs',
      'build',
      'test-data',
      'data',
      'input'
    ];

    const inputFiles = [];

    for (const dir of inputDirectories) {
      const dirPath = path.join(projectRoot, dir);
      if (await fs.pathExists(dirPath)) {
        const files = await fs.readdir(dirPath);
        const inputFilesInDir = files
          .filter(file => this.isInputFile(file))
          .map(file => path.join(dir, file));
        inputFiles.push(...inputFilesInDir);
      }
    }

    // If no input files found in directories, look for files in root
    if (inputFiles.length === 0) {
      const rootFiles = await fs.readdir(projectRoot);
      const inputFilesInRoot = rootFiles
        .filter(file => this.isInputFile(file))
        .map(file => file);
      inputFiles.push(...inputFilesInRoot);
    }

    return inputFiles;
  }

  /**
   * Check if file is an input file
   */
  isInputFile(filename) {
    const inputExtensions = ['.bin', '.json', '.yaml', '.yml', '.txt'];
    const inputPatterns = ['input', 'data', 'test'];
    
    const ext = path.extname(filename).toLowerCase();
    const name = path.basename(filename, ext).toLowerCase();
    
    return inputExtensions.includes(ext) || 
           inputPatterns.some(pattern => name.includes(pattern));
  }

  /**
   * Discover output directory using hardcoded logic
   */
  async discoverOutputDirectory(projectRoot) {
    const possibleOutputDirs = [
      'proofs',
      'proof',
      'outputs',
      'output',
      'generated-proofs'
    ];

    for (const dir of possibleOutputDirs) {
      const dirPath = path.join(projectRoot, dir);
      if (await fs.pathExists(dirPath)) {
        return dir;
      }
    }

    return 'proofs'; // Default fallback
  }

  /**
   * Discover build target from Cargo.toml or use default
   */
  async discoverBuildTarget(projectRoot) {
    const cargoTomlPath = path.join(projectRoot, 'Cargo.toml');
    
    if (!await fs.pathExists(cargoTomlPath)) {
      return 'riscv64ima-zisk-zkvm-elf';
    }

    try {
      const cargoContent = await fs.readFile(cargoTomlPath, 'utf8');
      
      // Look for target configuration
      const targetMatch = cargoContent.match(/target\s*=\s*"([^"]+)"/);
      if (targetMatch) {
        return targetMatch[1];
      }

      // Look for zisk-specific configuration
      const ziskMatch = cargoContent.match(/zisk.*target\s*=\s*"([^"]+)"/);
      if (ziskMatch) {
        return ziskMatch[1];
      }
    } catch (error) {
      // Ignore parsing errors
    }

    return 'riscv64ima-zisk-zkvm-elf'; // Default ZisK target
  }

  /**
   * Discover build profile from Cargo.toml or use default
   */
  async discoverBuildProfile(projectRoot) {
    const cargoTomlPath = path.join(projectRoot, 'Cargo.toml');
    
    if (!await fs.pathExists(cargoTomlPath)) {
      return 'release';
    }

    try {
      const cargoContent = await fs.readFile(cargoTomlPath, 'utf8');
      
      // Look for profile configuration
      const profileMatch = cargoContent.match(/profile\s*=\s*"([^"]+)"/);
      if (profileMatch) {
        return profileMatch[1];
      }

      // Look for zisk-specific profile
      const ziskProfileMatch = cargoContent.match(/zisk.*profile\s*=\s*"([^"]+)"/);
      if (ziskProfileMatch) {
        return ziskProfileMatch[1];
      }
    } catch (error) {
      // Ignore parsing errors
    }

    return 'release'; // Default profile
  }

  /**
   * Discover features from Cargo.toml
   */
  async discoverFeatures(projectRoot) {
    const cargoTomlPath = path.join(projectRoot, 'Cargo.toml');
    
    if (!await fs.pathExists(cargoTomlPath)) {
      return null;
    }

    try {
      const cargoContent = await fs.readFile(cargoTomlPath, 'utf8');
      
      // Look for features configuration
      const featuresMatch = cargoContent.match(/features\s*=\s*\[(.*?)\]/s);
      if (featuresMatch) {
        const featuresStr = featuresMatch[1];
        const features = featuresStr
          .split(',')
          .map(f => f.trim().replace(/['"]/g, ''))
          .filter(f => f.length > 0);
        return features.length > 0 ? features.join(',') : null;
      }
    } catch (error) {
      // Ignore parsing errors
    }

    return null;
  }

  /**
   * Get expected ELF path based on discovered project info
   */
  async getExpectedElfPath(projectRoot, profile = null) {
    const project = await this.discoverProject(projectRoot);
    const buildProfile = profile || project.buildProfile;
    const targetDir = buildProfile === 'release' ? 'release' : 'debug';
    
    return `target/${project.buildTarget}/${targetDir}/${project.name}`;
  }

  /**
   * Check if current directory is a ZisK project
   */
  async isZiskProject(projectRoot = process.cwd()) {
    const cargoTomlPath = path.join(projectRoot, 'Cargo.toml');
    
    if (!await fs.pathExists(cargoTomlPath)) {
      return false;
    }

    try {
      const cargoContent = await fs.readFile(cargoTomlPath, 'utf8');
      
      // Check for ziskos dependency
      return cargoContent.includes('ziskos') || 
             cargoContent.includes('zisk') ||
             cargoContent.includes('zkvm');
    } catch (error) {
      return false;
    }
  }
}

module.exports = { ProjectDiscoverer };
