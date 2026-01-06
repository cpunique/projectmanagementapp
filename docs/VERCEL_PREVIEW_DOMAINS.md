# Vercel Preview Domain Setup for Firebase Auth

## Problem
Firebase Auth only supports single-level wildcards (e.g., `*.example.com`), but Vercel preview URLs use multi-level subdomains like:
- `projectmanagementapp-git-claud-2c27e0-rcaton1105-3636s-projects.vercel.app`

This makes it impossible to use a wildcard like `*.rcaton1105-3636s-projects.vercel.app`.

## Solution 1: Use Custom Domain for Previews (RECOMMENDED)

### Step 1: Add Custom Domain to Vercel Project
1. Go to your Vercel project settings
2. Navigate to "Domains"
3. Add a custom domain you own (e.g., `kanban.yourdomain.com`)

### Step 2: Configure Preview Subdomains
Vercel automatically creates preview deployments at:
- `branch-name.kanban.yourdomain.com` (for branch deployments)
- `deployment-hash.kanban.yourdomain.com` (for commit deployments)

### Step 3: Add Wildcard to Firebase
1. Firebase Console → Authentication → Settings → Authorized domains
2. Add: `*.kanban.yourdomain.com`
3. Firebase will accept this single-level wildcard ✅

### Benefits
- Clean URLs for previews
- Single wildcard covers all previews
- More professional appearance
- Better for sharing with clients/team

---

## Solution 2: Use Broader Wildcard (Quick Fix)

**⚠️ SECURITY WARNING**: This allows ANY Vercel deployment to authenticate with your Firebase

1. Firebase Console → Authentication → Settings → Authorized domains
2. Add: `vercel.app` (try without asterisk first)
3. If that doesn't work, some users report success with just the base domain

**Why this is risky:**
- Anyone can create a Vercel app and potentially authenticate
- Only use for development/testing
- Remove before production launch

---

## Solution 3: Manual Addition Per Deployment

For each preview deployment:

1. Get the preview URL from Vercel deployment
2. Copy just the domain (no https://)
   - Example: `projectmanagementapp-git-claud-2c27e0-rcaton1105-3636s-projects.vercel.app`
3. Add to Firebase Console → Authentication → Authorized domains
4. Test authentication on that preview URL

**Script to help:**
```bash
node scripts/add-preview-domain.js [your-preview-domain]
```

This script shows you the exact steps and provides the cleaned domain to copy.

---

## Solution 4: Use Vercel Environment Variables

You can set up different Firebase projects for different environments:

### Development Firebase Project
- Less restrictive authorized domains
- Use `*.vercel.app` wildcard
- Separate from production data

### Production Firebase Project
- Strict authorized domains
- Only production domain
- Production data

**Implementation:**
1. Create a second Firebase project for dev/preview
2. Use different env vars in Vercel:
   - Production: `NEXT_PUBLIC_FIREBASE_PROJECT_ID=prod-project`
   - Preview: `NEXT_PUBLIC_FIREBASE_PROJECT_ID=dev-project`
3. Configure in Vercel project settings → Environment Variables

---

## Recommended Setup

**For now (testing):**
- ✅ You've already added the specific domain
- ✅ This works for current testing
- ⚠️ Will need to add each new preview URL manually

**For production:**
1. Purchase/use a custom domain
2. Add it to Vercel project
3. Configure preview subdomains
4. Use `*.preview.yourdomain.com` wildcard in Firebase
5. Keep production domain separate from preview domains

**For development workflow:**
- Consider using a separate Firebase project for previews
- Or use Vercel's production deployments only (skip preview auth testing)
- Or add specific preview domains as needed for important PRs

---

## Current Workaround

Since you've already added:
```
projectmanagementapp-git-claud-2c27e0-rcaton1105-3636s-projects.vercel.app
```

This specific preview URL will work for authentication. When you create a new preview deployment with a different hash, you'll need to add that new domain to Firebase.

**To minimize this:**
- Use Vercel's Git branch deployments (more stable URLs)
- Only test auth on specific preview deployments you care about
- Use local development for most auth testing

---

## Firebase Plan Requirements

Note: Firebase Spark (free) plan supports authorized domains. However, if you're experiencing issues:

1. Check your Firebase plan in Console
2. Ensure you haven't hit any Spark plan limits
3. Consider upgrading to Blaze (pay-as-you-go) if needed

Most users report wildcards work on Spark plan, so this is usually not the issue.

---

## Additional Resources

- [Vercel Custom Domains](https://vercel.com/docs/concepts/projects/domains)
- [Firebase Authorized Domains](https://firebase.google.com/docs/auth/web/redirect-best-practices#customize-domains)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
