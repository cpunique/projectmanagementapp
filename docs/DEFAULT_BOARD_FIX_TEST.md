# Default Board Persistence Fix - Testing Guide

## Problem Fixed
The default board setting wasn't persisting across logout/login cycles due to stale `defaultBoardId` values in localStorage.

## Root Cause
1. Previous code saved `defaultBoardId` to localStorage
2. The partialize function excluded it from NEW saves, but old data remained in storage
3. On hydration, the store was restoring the stale value from localStorage
4. Firestore load happened after localStorage restoration, but stale value remained

## Solution Implemented
1. **Migration Function Update**: Explicitly removes `defaultBoardId` from persisted state during hydration
2. **Logging Added**: Comprehensive logging to trace the flow at every step
3. **Source of Truth**: `defaultBoardId` now ONLY comes from Firestore

## Step-by-Step Testing

### Preparation
1. Open the app in a browser with developer tools open (F12)
2. Go to Console tab to view logs

### Test 1: Basic Default Board Persistence

**Steps:**
1. Click the star icon on "Kanban-app Features" board to set it as default
   - Watch console for: `[BoardSwitcher] Star clicked:` log
   - Watch console for: `[setUserDefaultBoard] ✅ Successfully saved to Firestore`
   - Star should become highlighted

2. Log out completely (sign out)

3. Log back in (sign in with same account)
   - Watch console for: `[Sync] Loading default board preference from Firestore...`
   - Watch console for: `[getUserDefaultBoard] Found defaultBoardId in Firestore: [board-id]`
   - Watch console for: `[Sync] Setting default board: [board-id] (Kanban-app Features)`

4. Verify: "Kanban-app Features" should load automatically with star highlighted

**Expected Logs:**
```
[setUserDefaultBoard] Saving default board for user: [uid] Board ID: [board-id]
[setUserDefaultBoard] ✅ Successfully saved to Firestore
...
[Sync] Loading default board preference from Firestore...
[getUserDefaultBoard] Fetching default board for user: [uid]
[getUserDefaultBoard] Found defaultBoardId in Firestore: [board-id]
[Sync] Setting default board: [board-id] (Kanban-app Features)
```

### Test 2: Unsetting Default Board

**Steps:**
1. Click the star icon on "Kanban-app Features" (which is currently default) to unset it
   - Watch console for: `[BoardSwitcher] Star clicked:` with `isUnsetting: true`
   - Watch console for: `[setUserDefaultBoard] Saving default board... Board ID: null`

2. Log out

3. Log back in
   - Watch console for: `[getUserDefaultBoard] Found defaultBoardId in Firestore: null`
   - Watch console for: `[Sync] No default board set, switching to first board`

4. Verify: First board ("Default Columns Test") loads without any board starred

**Expected Logs:**
```
[BoardSwitcher] Star clicked: { ... isUnsetting: true }
[setUserDefaultBoard] Saving default board... Board ID: null
[setUserDefaultBoard] ✅ Successfully saved to Firestore
...
[Sync] Loading default board preference from Firestore...
[getUserDefaultBoard] Found defaultBoardId in Firestore: null
[Sync] No default board set, switching to first board
```

### Test 3: Hard Refresh Behavior

**Steps:**
1. Set "Kanban-app Features" as default
2. Do a hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
   - Watch console for: `[Store Migration] Removing defaultBoardId from localStorage`
   - Watch console for: `[getUserDefaultBoard]` reading from Firestore
3. Verify: Correct board loads with star highlighted (not flashing)

### Test 4: Multiple Devices (if applicable)

**Steps:**
1. On Device A: Set "Kanban-app Features" as default
2. On Device B: Log out and back in (without any changes on Device A)
3. Device B should now see "Kanban-app Features" as default

### Test 5: Clear Cache & localStorage

**Advanced Test (to verify the fix works even with cleared cache):**

1. Set "Kanban-app Features" as default
2. Open DevTools → Application → Storage → Clear All Site Data
3. Still logged in? If so, refresh the page
4. You should be logged back in (Firebase auto-restore)
5. Verify "Kanban-app Features" loads as default
   - Logs should show: `[getUserDefaultBoard] Found defaultBoardId in Firestore: [board-id]`

## Debugging Tips

### If Default Board Not Persisting:

1. **Check Browser Console** for these logs:
   ```
   [setUserDefaultBoard] Saving default board...
   [getUserDefaultBoard] Fetching default board...
   ```
   - If missing: Function isn't being called

2. **Check Firestore Console**:
   - Go to Firebase Console → Firestore Database
   - Look at your user document
   - Verify `defaultBoardId` field has the correct board ID

3. **Check localStorage** (DevTools → Application → Local Storage):
   - Search for "kanban"
   - The stored JSON should NOT contain `defaultBoardId` anymore
   - If it does, that's leftover from before the fix

4. **Enable All Console Logs**:
   - Logs should include: `[Store Migration]`, `[setUserDefaultBoard]`, `[getUserDefaultBoard]`, `[Sync]`
   - If you don't see these, the logging code isn't running

### If Star Doesn't Highlight:

1. Check the `defaultBoardId` state in store:
   - In console: `JSON.stringify({ boards: useKanbanStore.getState().boards.map(b => b.name) })`
   - Verify store has correct `defaultBoardId`

2. Check the UI is reading from correct state:
   - Look for `defaultBoardId === boardId` comparison
   - This determines if star is highlighted

## Expected Behavior Timeline

1. **Page loads** → Store hydrates from localStorage → Migration removes `defaultBoardId` → `defaultBoardId` is `null`
2. **User logs in** → `initializeFirebaseSync()` runs → Calls `getUserDefaultBoard()` → Fetches from Firestore
3. **Default board returned** → `setDefaultBoard()` called → Store updated → UI re-renders → Star highlights

## Commits Related to This Fix

- **f04c16f**: Fix default board persistence by removing stale localStorage values
  - Added explicit `defaultBoardId` removal in migration function
  - Added comprehensive logging to trace the flow

## Files Modified

- `lib/store.ts`: Added explicit defaultBoardId removal in migration function
- `lib/firebase/firestore.ts`: Added logging to getUserDefaultBoard and setUserDefaultBoard
- `lib/firebase/storeSync.ts`: Added logging to board initialization flow
- `components/kanban/BoardSwitcher.tsx`: Added logging to handleSetDefaultBoard

## Next Steps if Issue Persists

If the fix doesn't work after testing:

1. **Clear all browser data**:
   - DevTools → Application → Clear All Site Data
   - Close and reopen browser

2. **Verify Firestore data**:
   - Check user document in Firebase Console
   - Ensure `defaultBoardId` field exists and has a value

3. **Check console logs**:
   - Share full console output from the test steps above
   - Include any error messages

4. **Verify Vercel deployment**:
   - The commit (f04c16f) must be deployed to Vercel
   - Check Vercel deployment history
   - May need to manually trigger a redeploy

