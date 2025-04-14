const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const BUILD_DIR = 'build';
const EXPORT_DIR = 'dist';

async function buildAndExport() {
  try {
    console.log('🚀 Starting production build process...');

    // Clean previous builds
    console.log('Cleaning previous builds...');
    await fs.remove(BUILD_DIR);
    await fs.remove(EXPORT_DIR);

    // Run production build
    console.log('Running production build...');
    execSync('npm run build', { stdio: 'inherit' });

    // Create export directory
    console.log('Creating export directory...');
    await fs.ensureDir(EXPORT_DIR);

    // Copy build files to export directory
    console.log('Copying build files to export directory...');
    await fs.copy(BUILD_DIR, EXPORT_DIR);

    // Copy additional files
    console.log('Copying additional files...');
    const filesToCopy = [
      'package.json',
      'README.md',
      '.env.production'
    ];

    for (const file of filesToCopy) {
      if (fs.existsSync(file)) {
        await fs.copy(file, path.join(EXPORT_DIR, file));
      }
    }

    // Create deployment instructions
    const deployInstructions = `
# HealthAssist Pro Frontend Deployment

This directory contains the production build of the HealthAssist Pro frontend application.

## Deployment Instructions

1. Configure your web server to serve the static files from this directory
2. Ensure all requests are redirected to index.html for client-side routing
3. Set up the following headers for security:
   - X-Frame-Options: DENY
   - X-Content-Type-Options: nosniff
   - Strict-Transport-Security: max-age=31536000; includeSubDomains

## Environment Configuration

Make sure to set up the following environment variables on your server:
- REACT_APP_API_URL: Your backend API URL
- NODE_ENV: production

## Files

- /static/: Contains all static assets (JS, CSS, media)
- index.html: The main entry point
- .env.production: Production environment configuration

For support, please contact the development team.
    `;

    await fs.writeFile(path.join(EXPORT_DIR, 'DEPLOY.md'), deployInstructions.trim());

    console.log('✅ Build and export completed successfully!');
    console.log(`📦 Export available in the '${EXPORT_DIR}' directory`);

  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildAndExport(); 