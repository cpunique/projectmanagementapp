# Development Guidelines

## Hydration Health & Commit Safety

### Problem
Previous commits occasionally caused Next.js hydration failures, requiring:
- Manual cache clearing
- Dev server restarts
- Rebuilds to fix styling issues

This happens when:
1. Stale webpack cache from previous builds
2. Node processes don't fully shut down
3. `.next` directory corruption
4. CSS/JS module resolution issues

### Solution

**For Daily Development:**

```bash
# Use the clean dev server to avoid cache issues
npm run dev:clean

# This automatically:
# 1. Removes .next/ directory (old builds)
# 2. Removes node_modules/.cache/ (old modules)
# 3. Starts fresh dev server
# 4. Works on Windows, macOS, and Linux

# Instead of: npm run dev
```

**After Making Changes:**

Before pushing commits:

```bash
# Always run a fresh build to verify
npm run build

# If build succeeds but styling looks broken, do:
npm run dev:clean
```

**If Hydration Breaks (Unstyled Page):**

```bash
# 1. Kill all node processes
taskkill /F /IM node.exe

# 2. Simply run the clean dev command (handles cleanup automatically)
npm run dev:clean
```

### Commit Checklist Before Pushing

- [ ] `npm run build` succeeds without errors
- [ ] Dev server starts without webpack errors
- [ ] Page loads with styling (not plain HTML)
- [ ] Header, buttons, and layout are visible and styled
- [ ] No "Loading..." spinner stuck on screen

### What to Avoid

1. **Don't modify client components that read from Zustand store without testing**
   - Changes to how store values are used can cause hydration mismatches
   - Always test: `npm run build && npm run dev:clean`

2. **Don't add console.logs in data fetching functions**
   - These can break Next.js RSC (React Server Components) bundling
   - Use browser DevTools console instead

3. **Don't modify the dependency arrays in useEffect without reason**
   - Missing dependencies can cause state to be out of sync on server vs client
   - Extra dependencies can cause infinite loops

### Safe Change Patterns

✅ **Safe**: Changes to styling, UI text, component props
✅ **Safe**: Adding new utility functions
✅ **Safe**: Changes to Firebase rules (don't need rebuild)
⚠️ **Risky**: Modifying store selectors or actions
⚠️ **Risky**: Changing how client components consume store state
❌ **Unsafe**: Modifying layout.tsx without testing
❌ **Unsafe**: Changing server vs client boundaries

### Recent Fixes Applied

**Commit 8ce5656** made 3 changes:

1. **KanbanBoard.tsx** - Added demoMode permission check
   - ✅ Safe: Only affects permission logic, not rendering
   - ✅ Tested: Build succeeds, app renders correctly

2. **useDefaultBoardSaver.ts** - Skip auto-save in demo mode
   - ✅ Safe: Only affects when effect runs, not how it renders
   - ✅ Tested: Verified with clean dev server start

3. **demoConfig.ts** - Added logging
   - ✅ Safe: Only affects console output
   - ✅ Tested: No impact on rendering

All changes were verified to not cause hydration mismatches because they don't affect the initial render tree.

## Testing Your Changes

### Quick Test (< 1 minute)
```bash
npm run build
# If green, you're good to commit
```

### Full Test (< 2 minutes)
```bash
npm run build
npm run dev:clean
# Wait for "Ready in Xs"
# Visit http://localhost:3000
# Verify page is styled and interactive
```

### Deep Test Before Push (< 5 minutes)
```bash
# Kill all node processes to simulate clean environment
taskkill /F /IM node.exe

# Clean dev build
npm run dev:clean

# Test as unauthenticated user
# - Page should show landing page with demo board
# - Demo board should be interactive

# Test as authenticated user (rcaton1105)
# - Your boards should load
# - Changes should persist to Firebase
# - Demo button should work without reverting
```

## When You See Issues

**Symptoms → Solution:**

| Symptom | Solution |
|---------|----------|
| Page shows plain HTML without styling | `npm run dev:clean` |
| "Cannot find module" error | `rm -rf .next` then `npm run dev:clean` |
| webpack errors in console | Kill node process, `npm run dev:clean` |
| React hydration warning | Clear browser cache, restart dev server |
| Page stuck on "Loading..." | Check browser console for errors |

## Common Mistakes

❌ Running `npm run dev` immediately after committing code that touches:
- Store selectors/actions
- Client component boundaries
- Layout or top-level providers

✅ Always run `npm run build` first to catch issues before starting dev server

## Performance Insights

- **Build time**: ~5-10 seconds
- **Dev server startup**: ~2-3 seconds with cache, ~10-15 seconds clean
- **Hot reload**: ~1 second for most changes
- **Full page load**: ~2 seconds after authentication

If build takes > 30s or dev startup > 20s, something is wrong - stop and check for issues.
