module.exports = {
  "project": {
    "name": "my-zisk-project",
    "version": "1.0.0",
    "zkvm": "zisk"
  },
  "inputs": {
    "directory": "./inputs",
    "formats": {
      ".json": "json-serializer",
      ".yaml": "yaml-serializer",
      ".yml": "yaml-serializer",
      ".txt": "text-serializer",
      ".bin": "passthrough"
    },
    "defaultInput": "example.json"
  },
  "outputs": {
    "directory": "./outputs",
    "organize": true,
    "keepLogs": true,
    "compression": false
  },
  "build": {
    "profile": "release",
    "features": [],
    "target": "riscv64ima-zisk-zkvm-elf",
    "useExistingBuildScript": true
  },
  "zisk": {
    "provingKey": null,
    "witnessLibrary": null,
    "executionMode": "auto",
    "parallelism": "auto",
    "memoryLimit": null,
    "chunkSizeBits": null,
    "unlockMappedMemory": false,
    "saveProofs": true,
    "verifyProofs": false
  },
  "development": {
    "watch": {
      "enabled": false,
      "patterns": [
        "programs/**/*.rs",
        "inputs/**/*"
      ],
      "debounce": 1000
    },
    "debug": {
      "enabled": false,
      "level": 1,
      "categories": [],
      "keepTempFiles": false
    }
  }
};