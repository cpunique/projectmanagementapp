#!/usr/bin/env node

/**
 * Script to automatically add Vercel preview domains to Firebase authorized domains
 * Run this as part of your Vercel build process or manually for each preview deployment
 *
 * Usage:
 *   node scripts/add-preview-domain.js [preview-domain]
 *
 * Example:
 *   node scripts/add-preview-domain.js projectmanagementapp-git-claud-2c27e0-rcaton1105-3636s-projects.vercel.app
 *
 * Required Environment Variables:
 *   FIREBASE_PROJECT_ID - Your Firebase project ID
 *   GOOGLE_APPLICATION_CREDENTIALS - Path to service account JSON (for local use)
 *   Or FIREBASE_SERVICE_ACCOUNT_KEY - Base64 encoded service account JSON (for CI/CD)
 */

const https = require('https');

// Get domain from command line args or Vercel env var
const domain = process.argv[2] || process.env.VERCEL_URL;

if (!domain) {
  console.error('❌ Error: No domain provided');
  console.error('Usage: node scripts/add-preview-domain.js [domain]');
  console.error('Or set VERCEL_URL environment variable');
  process.exit(1);
}

// Remove protocol if present
const cleanDomain = domain.replace(/^https?:\/\//, '');

const projectId = process.env.FIREBASE_PROJECT_ID;

if (!projectId) {
  console.error('❌ Error: FIREBASE_PROJECT_ID environment variable not set');
  process.exit(1);
}

console.log(`📝 Adding domain to Firebase Auth: ${cleanDomain}`);
console.log(`📁 Project: ${projectId}`);

// This is a placeholder - Firebase doesn't have a public API for this
// You would need to:
// 1. Use Firebase Admin SDK with appropriate permissions
// 2. Or use Google Cloud Identity Platform API
// 3. Or manually add through Firebase Console

console.log('\n⚠️  Note: Firebase Auth authorized domains cannot be modified via API in the standard way.');
console.log('');
console.log('You have three options:');
console.log('');
console.log('1. MANUAL: Add this domain in Firebase Console:');
console.log(`   → https://console.firebase.google.com/project/${projectId}/authentication/providers`);
console.log(`   → Click "Authorized domains" → Add domain: ${cleanDomain}`);
console.log('');
console.log('2. USE BROADER WILDCARD: Add *.vercel.app (less secure)');
console.log('   → Firebase Console → Authorized domains → Add: *.vercel.app');
console.log('');
console.log('3. CUSTOM DOMAIN: Set up a custom domain for previews in Vercel');
console.log('   → Then use wildcard like *.preview.yourdomain.com');
console.log('');
console.log('💡 Recommended: Use Option 3 for production-ready setup');

// For information purposes, show the domain that needs to be added
console.log('\n📋 Domain to add (copy this):');
console.log(`   ${cleanDomain}`);
