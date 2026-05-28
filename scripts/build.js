/**
 * Hexo Desktop Client - Build Script
 *
 * This script handles the full build pipeline:
 * 1. Clean previous build artifacts
 * 2. Compile TypeScript (main + renderer)
 * 3. Bundle with Vite
 * 4. Package with electron-builder
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const DIST_ELECTRON = path.join(ROOT, 'dist-electron');
const RELEASE = path.join(ROOT, 'release');

function log(message) {
  console.log(`\x1b[36m[Build]\x1b[0m ${message}`);
}

function error(message) {
  console.error(`\x1b[31m[Error]\x1b[0m ${message}`);
}

function run(command, options = {}) {
  log(`Running: ${command}`);
  try {
    return execSync(command, {
      cwd: ROOT,
      stdio: 'inherit',
      ...options,
    });
  } catch (err) {
    error(`Command failed: ${command}`);
    process.exit(1);
  }
}

// Parse arguments
const args = process.argv.slice(2);
const target = args[0] || 'all'; // all, win, linux, mac

async function build() {
  log('=== Hexo Desktop Client Build ===');
  log(`Target: ${target}`);

  // Step 1: Clean
  log('Cleaning previous build artifacts...');
  [DIST, DIST_ELECTRON].forEach((dir) => {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      log(`  Removed: ${path.relative(ROOT, dir)}`);
    }
  });
  // Clean release only if building for all platforms (not single target)
  if (target === 'all' && fs.existsSync(RELEASE)) {
    fs.rmSync(RELEASE, { recursive: true, force: true });
    log(`  Removed: ${path.relative(ROOT, RELEASE)}`);
  }

  // Step 2: Install dependencies (if needed)
  if (!fs.existsSync(path.join(ROOT, 'node_modules'))) {
    log('Installing dependencies...');
    run('npm install');
  }

  // Step 3: TypeScript check
  log('Running TypeScript type check...');
  run('npx tsc --noEmit', { stdio: 'pipe' });

  // Step 4: Build with Vite (includes electron main + preload)
  log('Building with Vite...');
  run('npx vite build');

  // Step 5: Package with electron-builder
  log('Packaging with electron-builder...');

  const isWindowsBuildLinux = process.platform === 'win32' && target === 'linux';

  switch (target) {
    case 'win':
      run('npx electron-builder --win --x64');
      break;
    case 'linux':
      if (isWindowsBuildLinux) {
        log('Building Linux tar.gz on Windows (AppImage requires Linux host for symlinks)...');
        run('npx electron-builder --linux --x64 --config.linux.target=tar.gz');
      } else {
        run('npx electron-builder --linux --x64');
      }
      break;
    case 'mac':
      run('npx electron-builder --mac --x64 --arm64');
      break;
    default:
      run('npx electron-builder');
      break;
  }

  log('=== Build Complete ===');

  // List output files
  if (fs.existsSync(RELEASE)) {
    const files = fs.readdirSync(RELEASE);
    log(`Output files in ${path.relative(ROOT, RELEASE)}:`);
    files.forEach((file) => {
      const stat = fs.statSync(path.join(RELEASE, file));
      const sizeMB = (stat.size / (1024 * 1024)).toFixed(2);
      console.log(`  ${file} (${sizeMB} MB)`);
    });
  }
}

build().catch((err) => {
  error(err.message);
  process.exit(1);
});
