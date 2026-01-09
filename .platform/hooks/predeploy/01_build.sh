#!/bin/bash
# Pre-deploy hook to install dependencies and build the application
# This runs before the app starts

set -xe

# Source Node.js environment
export PATH="/var/app/staging/node_modules/.bin:$PATH"

echo "=== Node.js version ==="
node --version
echo "=== NPM version ==="
npm --version

echo "=== Current directory ==="
pwd

cd /var/app/staging

echo "=== Contents of staging directory ==="
ls -la

echo "=== Installing all dependencies ==="
npm run install:all

echo "=== Building application ==="
npm run build

echo "=== Verifying build output ==="
ls -la frontend/dist/ || echo "Frontend dist not found"
ls -la backend/dist/ || echo "Backend dist not found"

echo "=== Build complete ==="
