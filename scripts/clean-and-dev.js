#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

/**
 * Cross-platform script to clean build cache and start dev server
 * Works on Windows, macOS, and Linux
 */

const dirs = ['.next', 'node_modules/.cache'];

console.log('🧹 Cleaning build cache...');

// Remove directories recursively
dirs.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (fs.existsSync(fullPath)) {
    console.log(`  Removing ${dir}...`);
    removeDir(fullPath);
  }
});

console.log('✅ Cache cleaned\n');
console.log('🚀 Starting dev server...\n');

// Start dev server
const nextDev = spawn('next', ['dev'], {
  stdio: 'inherit',
  shell: true,
});

nextDev.on('error', (err) => {
  console.error('Failed to start dev server:', err);
  process.exit(1);
});

nextDev.on('exit', (code) => {
  process.exit(code);
});

/**
 * Recursively remove a directory
 */
function removeDir(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      fs.readdirSync(dirPath).forEach(file => {
        const filePath = path.join(dirPath, file);
        if (fs.lstatSync(filePath).isDirectory()) {
          removeDir(filePath);
        } else {
          fs.unlinkSync(filePath);
        }
      });
      fs.rmdirSync(dirPath);
    }
  } catch (err) {
    console.error(`Error removing ${dirPath}:`, err.message);
  }
}
