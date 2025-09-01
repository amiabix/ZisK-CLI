#!/bin/bash

# Test script for ZISK project

echo "Running ZISK tests..."

# Run all tests
zisk-dev test

# Run specific test types
# zisk-dev test --unit
# zisk-dev test --integration
# zisk-dev test --e2e

echo "Tests completed!"
