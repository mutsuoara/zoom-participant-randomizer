#!/bin/bash
# Pre-deploy hook to install production dependencies
# Note: Application is pre-built locally before deployment
# This runs before the app starts

set -xe

cd /var/app/staging

echo "=== Node.js version ==="
node --version

echo "=== NPM version ==="
npm --version

echo "=== Contents of staging directory ==="
ls -la

echo "=== Verifying pre-built dist folders ==="
ls -la frontend/dist/ || { echo "ERROR: frontend/dist not found - run npm run build locally first"; exit 1; }
ls -la backend/dist/ || { echo "ERROR: backend/dist not found - run npm run build locally first"; exit 1; }

echo "=== Installing production dependencies ==="
# Install root dependencies
npm ci --production --ignore-scripts 2>/dev/null || npm install --production --ignore-scripts

# Install backend runtime dependencies only
cd backend
npm ci --production --ignore-scripts 2>/dev/null || npm install --production --ignore-scripts

echo "=== Installation complete ==="
