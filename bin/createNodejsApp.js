#!/usr/bin/env node

/**
 * Express Forge - Production-grade Boilerplate CLI Initializer
 * Designed with absolute resilience, clean logging, and robust process safety.
 */

const util = require('util');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const exec = util.promisify(require('child_process').exec);
/* eslint-disable no-console */

// ======================================
// Configuration & Brand
// ======================================
const repo = process.env.NOTES_BACKEND_REPO || 'https://github.com/YOUR_USERNAME/notes-backend.git';
const cliName = 'create-enterprise-backend';
const boilerplateName = 'Enterprise ERP Backend Blueprint';

// =x1b ANSI Colors for Premium Console UI
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

// ======================================
// Utilities & Process Safety
// ======================================

function log(color, text, isBright = false) {
  const prefix = isBright ? colors.bright : '';
  // eslint-disable-next-line no-console
  console.log(`${prefix}${color}${text}${colors.reset}`);
}

function printBanner() {
  console.log('');
  log(colors.cyan, '┌────────────────────────────────────────────────────────┐', true);
  log(colors.cyan, `│             🚀  Welcome to ${boilerplateName}          │`, true);
  log(colors.cyan, '│     Build production-grade Enterprise APIs instantly.  │', false);
  log(colors.cyan, '└────────────────────────────────────────────────────────┘', true);
  console.log('');
}

async function checkPrerequisites() {
  try {
    execSync('git --version', { stdio: 'ignore' });
  } catch (e) {
    log(colors.red, '❌ Error: Git is not installed or available in your system path.', true);
    process.exit(1);
  }

  try {
    execSync('npm --version', { stdio: 'ignore' });
  } catch (e) {
    log(colors.red, '❌ Error: Node.js/npm is not installed or available in your system path.', true);
    process.exit(1);
  }
}

async function runCmd(command, customErrorMsg) {
  try {
    const { stdout, stderr } = await exec(command);
    return { stdout, stderr };
  } catch (error) {
    console.error('');
    log(colors.red, `❌ Command failed: ${command}`, true);
    if (customErrorMsg) {
      log(colors.yellow, `💡 Tip: ${customErrorMsg}`, false);
    }
    console.error(colors.dim + error.message + colors.reset);
    throw error;
  }
}

function removeIfExists(targetPath) {
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  if (fs.existsSync(targetPath)) {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
}

// ======================================
// Input Arguments Validation
// ======================================

if (process.argv.length < 3) {
  printBanner();
  log(colors.yellow, 'Usage:', true);
  console.log(`    npx ${cliName} <project-directory>`);
  console.log('');
  log(colors.yellow, 'Example:', true);
  console.log(`    npx ${cliName} my-notes-backend`);
  console.log('');
  process.exit(1);
}

const ownPath = process.cwd();
const folderName = process.argv[2];
const appPath = path.join(ownPath, folderName);

// Clean up helper if installation is aborted/interrupted
function cleanupPartialInstall() {
  log(colors.yellow, '\n⚠️  Installation interrupted. Cleaning up generated directories...', true);
  removeIfExists(appPath);
  log(colors.green, '✅ Cleanup finished. Done.', false);
  process.exit(1);
}

// Bind termination signals to clean up partially cloned repositories safely
process.on('SIGINT', cleanupPartialInstall);
process.on('SIGTERM', cleanupPartialInstall);

// ======================================
// Main Installation Orchestrator
// ======================================

async function setup() {
  await checkPrerequisites();
  printBanner();

  // 1. Verify and create project directory
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  if (fs.existsSync(appPath)) {
    log(colors.red, `❌ Directory "${folderName}" already exists.`, true);
    log(colors.yellow, '👉 Please choose another project folder name or delete the folder first.', false);
    console.log('');
    process.exit(1);
  }

  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    fs.mkdirSync(appPath);
  } catch (error) {
    log(colors.red, `❌ Failed to create folder at path: ${appPath}`, true);
    console.error(error);
    process.exit(1);
  }

  try {
    // 2. Clone boilerplate repository
    log(colors.cyan, '📥 Step 1: Downloading standard boilerplate repository...', true);
    log(colors.dim, `   Cloning from: ${repo}`);
    await runCmd(`git clone --depth 1 ${repo} "${appPath}"`, 'Make sure your network connection is stable.');
    log(colors.green, '✅ Download complete.\n');

    // Shift working context into the target folder
    process.chdir(appPath);

    // 3. Purge existing boilerplate git references
    log(colors.cyan, '🧹 Step 2: Resetting Git structures and cleaning legacy files...', true);
    removeIfExists(path.join(appPath, '.git'));
    removeIfExists(path.join(appPath, 'package-lock.json'));
    removeIfExists(path.join(appPath, 'CHANGELOG.md'));
    // Note: CONTRIBUTING.md and docs/ADR are INTENTIONALLY PRESERVED
    // to maintain architectural rules for new projects.
    removeIfExists(path.join(appPath, 'bin')); // Purge initializer scripts folder inside clone
    log(colors.green, '✅ Clean complete.\n');

    // 4. Initialize clean Git repository (Absolute Expert Move!)
    log(colors.cyan, '🔧 Step 3: Initializing clean Git repository...', true);
    await runCmd('git init');
    log(colors.green, '✅ Fresh Git repository initialized.\n');

    // 5. Setup Environment File
    log(colors.cyan, '📝 Step 4: Configuring project environment files...', true);
    const envExamplePath = path.join(appPath, '.env.example');
    const envPath = path.join(appPath, '.env');
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (fs.existsSync(envExamplePath)) {
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      fs.copyFileSync(envExamplePath, envPath);
      log(colors.green, '✅ Generated local .env file.');
    } else {
      log(colors.yellow, '⚠️  .env.example file not found. Skipping auto .env creation.');
    }
    console.log('');

    // 6. Install Dependencies
    log(colors.cyan, '📦 Step 5: Installing project dependencies (this may take a few moments)...', true);
    await runCmd('npm install', 'Ensure node and npm are fully updated and network limits are off.');
    log(colors.green, '✅ Dependencies successfully installed.\n');

    // 7. Initial commit to set a healthy HEAD reference
    log(colors.cyan, '💾 Step 6: Creating initial Git commit...', true);
    try {
      await runCmd('git add .');
      await runCmd('git commit -m "chore: initial commit from Enterprise Blueprint"');
      log(colors.green, '✅ Initial commit created successfully.');
    } catch (gitErr) {
      log(colors.yellow, '⚠️  Could not create initial commit automatically (likely due to global git configs).');
    }
    console.log('');

    // 8. Print premium success manual
    log(colors.green, '🎉 Installation Completed Successfully! 🚀', true);
    console.log('────────────────────────────────────────────────────────');
    log(colors.bright, 'How to spin up your new project:', true);
    console.log('');
    log(colors.cyan, `    1. Navigate to your project folder:`);
    log(colors.yellow, `       cd ${folderName}`);
    console.log('');
    log(colors.cyan, '    2. Spin up Docker Stacks (PostgreSQL instance):');
    log(colors.yellow, '       npm run docker:dev');
    console.log('');
    log(colors.cyan, '    3. Apply database migrations (Strict ERP-ready):');
    log(colors.yellow, '       npx prisma migrate dev');
    console.log('');
    log(colors.cyan, '    4. Start modern hot-reloading development server:');
    log(colors.yellow, '       npm run dev');
    console.log('');
    log(colors.cyan, '    5. Run comprehensive Test suite (Requires Docker for Testcontainers):');
    log(colors.yellow, '       npm test');
    console.log('');
    console.log('────────────────────────────────────────────────────────');
    log(colors.magenta, `⚡ Welcome to ${boilerplateName} - Build safe, resilient apps faster!`, true);
    console.log('');

    // Unbind shutdown cleanup hooks upon successful completion
    process.removeAllListeners('SIGINT');
    process.removeAllListeners('SIGTERM');
  } catch (error) {
    log(colors.red, '\n❌ Installation failed. Reverting changes...', true);
    removeIfExists(appPath);
    process.exit(1);
  }
}

// Execute setup
setup();
