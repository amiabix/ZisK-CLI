/**
 * Input Conversion System
 * Handles conversion of various input formats to ZISK-compatible binary format
 */

const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const crypto = require('crypto');
const { Logger } = require('./logger');
const { ValidationError } = require('./errors');

class InputConverter {
  constructor() {
    this.logger = new Logger();
    this.converters = new Map();
    this.registerConverters();
  }

  /**
   * Register all available converters
   */
  registerConverters() {
    this.converters.set('.json', new JsonToBinaryConverter());
    this.converters.set('.yaml', new YamlToBinaryConverter());
    this.converters.set('.yml', new YamlToBinaryConverter());
    this.converters.set('.txt', new TextToBinaryConverter());
    this.converters.set('.bin', new PassThroughConverter());
    this.converters.set('.custom', new CustomFormatConverter());
  }

  /**
   * Convert input file to binary format
   */
  async convertInput(inputPath, outputPath = null, options = {}) {
    const startTime = Date.now();

    try {
      // Validate input file exists
      if (!await fs.pathExists(inputPath)) {
        throw new ValidationError(`Input file not found: ${inputPath}`);
      }

      // Determine output path
      const finalOutputPath = outputPath || this.getDefaultOutputPath(inputPath);

      // Get file extension
      const ext = path.extname(inputPath).toLowerCase();
      const converter = this.converters.get(ext);

      if (!converter) {
        throw new ValidationError(`Unsupported input format: ${ext}`);
      }

      // Convert file
      this.logger.progress(`Converting ${path.basename(inputPath)} to binary format`);
      
      await converter.convert(inputPath, finalOutputPath, options);

      const duration = Date.now() - startTime;
      this.logger.success(`Input conversion completed in ${duration}ms`, {
        inputPath,
        outputPath: finalOutputPath,
        duration
      });

      return {
        inputPath,
        outputPath: finalOutputPath,
        duration,
        size: await this.getFileSize(finalOutputPath)
      };
    } catch (error) {
      this.logger.error('Input conversion failed', error);
      throw error;
    }
  }

  /**
   * Convert multiple input files
   */
  async convertInputs(inputPaths, outputDir = null, options = {}) {
    const results = [];
    const outputDirectory = outputDir || './build';

    // Ensure output directory exists
    await fs.ensureDir(outputDirectory);

    for (const inputPath of inputPaths) {
      try {
        const outputPath = path.join(outputDirectory, this.getBinaryFilename(inputPath));
        const result = await this.convertInput(inputPath, outputPath, options);
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to convert ${inputPath}`, error);
        results.push({
          inputPath,
          error: error.message,
          success: false
        });
      }
    }

    return results;
  }

  /**
   * Get default output path for input file
   */
  getDefaultOutputPath(inputPath) {
    const dir = path.dirname(inputPath);
    const name = path.basename(inputPath, path.extname(inputPath));
    return path.join(dir, 'build', `${name}.bin`);
  }

  /**
   * Get binary filename for input file
   */
  getBinaryFilename(inputPath) {
    const name = path.basename(inputPath, path.extname(inputPath));
    return `${name}.bin`;
  }

  /**
   * Get file size in bytes
   */
  async getFileSize(filePath) {
    const stats = await fs.stat(filePath);
    return stats.size;
  }

  /**
   * Validate input file format
   */
  async validateInput(inputPath) {
    const ext = path.extname(inputPath).toLowerCase();
    const converter = this.converters.get(ext);

    if (!converter) {
      throw new ValidationError(`Unsupported input format: ${ext}`);
    }

    return await converter.validate(inputPath);
  }

  /**
   * Get supported input formats
   */
  getSupportedFormats() {
    return Array.from(this.converters.keys());
  }
}

/**
 * Base converter class
 */
class BaseConverter {
  constructor() {
    this.logger = new Logger();
  }

  async convert(inputPath, outputPath, options = {}) {
    throw new Error('convert method must be implemented');
  }

  async validate(inputPath) {
    return true;
  }

  /**
   * Create ZISK-compatible binary header
   */
  createHeader(dataLength, options = {}) {
    const header = Buffer.alloc(16);
    
    // Magic number (ZISK)
    header.write('ZISK', 0);
    
    // Version (1.0)
    header.writeUInt16LE(1, 4);
    header.writeUInt16LE(0, 6);
    
    // Data length
    header.writeBigUInt64LE(BigInt(dataLength), 8);
    
    return header;
  }

  /**
   * Write binary file with header
   */
  async writeBinaryFile(outputPath, data, options = {}) {
    const header = this.createHeader(data.length, options);
    const buffer = Buffer.concat([header, data]);
    
    await fs.writeFile(outputPath, buffer);
    
    this.logger.logFileOperation('write', outputPath, {
      size: buffer.length,
      headerSize: header.length,
      dataSize: data.length
    });
  }
}

/**
 * JSON to Binary Converter
 */
class JsonToBinaryConverter extends BaseConverter {
  async convert(inputPath, outputPath, options = {}) {
    // Read JSON file
    const content = await fs.readFile(inputPath, 'utf8');
    const data = JSON.parse(content);

    // Serialize to bytes
    const serialized = this.serialize(data, options);

    // Write binary file
    await this.writeBinaryFile(outputPath, serialized, options);
  }

  async validate(inputPath) {
    try {
      const content = await fs.readFile(inputPath, 'utf8');
      JSON.parse(content);
      return true;
    } catch (error) {
      throw new ValidationError(`Invalid JSON format: ${error.message}`);
    }
  }

  serialize(data, options = {}) {
    const format = options.format || 'default';
    
    switch (format) {
      case 'compact':
        return this.serializeCompact(data);
      case 'typed':
        return this.serializeTyped(data);
      default:
        return this.serializeDefault(data);
    }
  }

  serializeDefault(data) {
    // Simple serialization: convert to string and encode as UTF-8
    const jsonString = JSON.stringify(data);
    return Buffer.from(jsonString, 'utf8');
  }

  serializeCompact(data) {
    // Compact serialization without whitespace
    const jsonString = JSON.stringify(data, null, 0);
    return Buffer.from(jsonString, 'utf8');
  }

  serializeTyped(data) {
    // Type-aware serialization
    const buffer = Buffer.alloc(0);
    
    if (typeof data === 'number') {
      if (Number.isInteger(data)) {
        const intBuffer = Buffer.alloc(8);
        intBuffer.writeBigInt64LE(BigInt(data), 0);
        return Buffer.concat([Buffer.from([0x01]), intBuffer]);
      } else {
        const floatBuffer = Buffer.alloc(8);
        floatBuffer.writeDoubleLE(data, 0);
        return Buffer.concat([Buffer.from([0x02]), floatBuffer]);
      }
    } else if (typeof data === 'string') {
      const stringBuffer = Buffer.from(data, 'utf8');
      const lengthBuffer = Buffer.alloc(4);
      lengthBuffer.writeUInt32LE(stringBuffer.length, 0);
      return Buffer.concat([Buffer.from([0x03]), lengthBuffer, stringBuffer]);
    } else if (Array.isArray(data)) {
      const lengthBuffer = Buffer.alloc(4);
      lengthBuffer.writeUInt32LE(data.length, 0);
      let arrayBuffer = Buffer.concat([Buffer.from([0x04]), lengthBuffer]);
      
      for (const item of data) {
        arrayBuffer = Buffer.concat([arrayBuffer, this.serializeTyped(item)]);
      }
      
      return arrayBuffer;
    } else if (typeof data === 'object' && data !== null) {
      const keys = Object.keys(data);
      const lengthBuffer = Buffer.alloc(4);
      lengthBuffer.writeUInt32LE(keys.length, 0);
      let objectBuffer = Buffer.concat([Buffer.from([0x05]), lengthBuffer]);
      
      for (const key of keys) {
        const keyBuffer = Buffer.from(key, 'utf8');
        const keyLengthBuffer = Buffer.alloc(4);
        keyLengthBuffer.writeUInt32LE(keyBuffer.length, 0);
        objectBuffer = Buffer.concat([
          objectBuffer,
          keyLengthBuffer,
          keyBuffer,
          this.serializeTyped(data[key])
        ]);
      }
      
      return objectBuffer;
    } else {
      return Buffer.from([0x00]); // null/undefined
    }
  }
}

/**
 * YAML to Binary Converter
 */
class YamlToBinaryConverter extends BaseConverter {
  async convert(inputPath, outputPath, options = {}) {
    // Read YAML file
    const content = await fs.readFile(inputPath, 'utf8');
    const data = yaml.load(content);

    // Convert to JSON first, then serialize
    const jsonConverter = new JsonToBinaryConverter();
    const serialized = jsonConverter.serialize(data, options);

    // Write binary file
    await this.writeBinaryFile(outputPath, serialized, options);
  }

  async validate(inputPath) {
    try {
      const content = await fs.readFile(inputPath, 'utf8');
      yaml.load(content);
      return true;
    } catch (error) {
      throw new ValidationError(`Invalid YAML format: ${error.message}`);
    }
  }
}

/**
 * Text to Binary Converter
 */
class TextToBinaryConverter extends BaseConverter {
  async convert(inputPath, outputPath, options = {}) {
    // Read text file
    const content = await fs.readFile(inputPath, 'utf8');
    
    // Parse text based on format
    const data = this.parseText(content, options);

    // Serialize to binary
    const jsonConverter = new JsonToBinaryConverter();
    const serialized = jsonConverter.serialize(data, options);

    // Write binary file
    await this.writeBinaryFile(outputPath, serialized, options);
  }

  parseText(content, options = {}) {
    const format = options.format || 'lines';
    
    switch (format) {
      case 'lines':
        return content.split('\n').filter(line => line.trim());
      case 'csv':
        return this.parseCSV(content);
      case 'keyvalue':
        return this.parseKeyValue(content);
      default:
        return { content };
    }
  }

  parseCSV(content) {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row = {};
      
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[j] || '';
      }
      
      data.push(row);
    }
    
    return data;
  }

  parseKeyValue(content) {
    const lines = content.split('\n').filter(line => line.trim());
    const data = {};
    
    for (const line of lines) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        data[key.trim()] = valueParts.join('=').trim();
      }
    }
    
    return data;
  }

  async validate(inputPath) {
    try {
      await fs.readFile(inputPath, 'utf8');
      return true;
    } catch (error) {
      throw new ValidationError(`Cannot read text file: ${error.message}`);
    }
  }
}

/**
 * Pass-through Converter (for binary files)
 */
class PassThroughConverter extends BaseConverter {
  async convert(inputPath, outputPath, options = {}) {
    // Copy binary file directly
    await fs.copy(inputPath, outputPath);
    
    this.logger.logFileOperation('copy', outputPath, {
      source: inputPath
    });
  }

  async validate(inputPath) {
    try {
      await fs.access(inputPath, fs.constants.R_OK);
      return true;
    } catch (error) {
      throw new ValidationError(`Cannot read binary file: ${error.message}`);
    }
  }
}

/**
 * Custom Format Converter
 */
class CustomFormatConverter extends BaseConverter {
  async convert(inputPath, outputPath, options = {}) {
    // Load custom converter if specified
    const converterPath = options.converter;
    
    if (!converterPath) {
      throw new ValidationError('Custom converter path not specified');
    }

    // Dynamic import of custom converter
    const customConverter = require(path.resolve(converterPath));
    
    if (typeof customConverter.convert !== 'function') {
      throw new ValidationError('Custom converter must have convert method');
    }

    // Use custom converter
    const data = await customConverter.convert(inputPath, options);
    
    if (Buffer.isBuffer(data)) {
      await this.writeBinaryFile(outputPath, data, options);
    } else {
      // Convert to binary using JSON converter
      const jsonConverter = new JsonToBinaryConverter();
      const serialized = jsonConverter.serialize(data, options);
      await this.writeBinaryFile(outputPath, serialized, options);
    }
  }

  async validate(inputPath) {
    // Custom validation logic
    return true;
  }
}

module.exports = { InputConverter };
