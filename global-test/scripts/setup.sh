#!/bin/bash

# Setup script for ZISK project

echo "Setting up ZISK development environment..."

# Install ZISK dependencies
zisk-dev install

# Verify installation
zisk-dev doctor

# Build project
zisk-dev build

echo "Setup completed successfully!"
