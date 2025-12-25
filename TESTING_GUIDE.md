# Phase 5: Multi-User Testing & Real-Time Sync Guide

## Overview

This guide helps you test real-time multi-user scenarios to ensure your Kanban app works correctly with Firebase.

**Testing Goals:**
- ✅ Real-time updates sync between two users
- ✅ Changes appear instantly (or within 1 second)
- ✅ Offline changes sync when reconnected
- ✅ User isolation works (can't see other user's private boards)
- ✅ Shared boards work correctly
- ✅ No data corruption or conflicts

---

## Test Environment Setup

### Requirements

- **2 Devices or Browsers:**
  - Device A: Your primary account
  - Device B: Your partner's account (or same browser, different window)

- **Network Access:**
  - Both devices connected to internet
  - Can see each other's changes in real-time

- **Test Accounts:**
  - Account A: `your-email@gmail.com`
  - Account B: `partner-email@gmail.com` (or use test accounts)

### Setup Steps

1. **Deploy Security Rules** (see FIREBASE_SECURITY_SETUP.md)
   - Ensure rules are deployed before testing

2. **Start the App on Both Devices**
   ```bash
   npm run dev
   # App runs on http://localhost:3000
   ```
   - Device A: http://localhost:3000
   - Device B: http://localhost:3000 (different browser/incognito)

3. **Sign In with Different Accounts**
   - Device A: Sign in with Account A
   - Device B: Sign in with Account B

---

## Test Suite 1: Basic Authentication & Isolation

### Test 1.1: User Authentication
**Objective:** Verify users can sign in and see login screen when not authenticated

**Steps:**
1. Open app in fresh browser (incognito mode)
2. You should see LoginModal (sign in screen)
3. Try invalid email/password
   - Should show error message ❌
4. Sign in with valid credentials
   - Should show Kanban board ✅

**Expected Results:**
- ✅ Loading spinner appears briefly
- ✅ LoginModal displays with email/password fields
- ✅ Google Sign-In button works
- ✅ Can toggle between "Sign In" and "Create Account" modes
- ✅ Error messages display correctly
- ✅ After successful login, modal closes and board shows

---

### Test 1.2: User Isolation
**Objective:** Verify users can't see other users' boards

**Steps:**

1. **Device A (Your Account):**
   - Create a board named "Private Board A"
   - Verify board appears in board switcher

2. **Device B (Partner's Account):**
   - Sign in with different account
   - Look at board switcher
   - Should be EMPTY or show different boards

3. **Device A:**
   - Create a card in "Private Board A"
   - Modify the card (change title, add notes)

4. **Device B:**
   - Should NOT see "Private Board A"
   - Should NOT see the card created
   - Partner's board list stays unchanged

**Expected Results:**
- ✅ Device A shows boards owned by Account A
- ✅ Device B shows boards owned by Account B
- ✅ No cross-user data leakage
- ✅ Each user has isolated view

---

## Test Suite 2: Real-Time Sync

### Test 2.1: Card Creation Sync
**Objective:** Verify cards created by one user appear instantly on other user's device

**Setup:**
- Both users are in same board (need to implement sharing first)
- For now: Both create their own boards and verify no cross-contamination

**Steps:**

1. **Device A:**
   - Open board "Board A"
   - Create a new column "Testing"

2. **Device A:**
   - In column "Testing", create card "Test Card 1"
   - Note the timestamp

3. **Device A:**
   - Should see card immediately ✅
   - Sync status should show "Synced" ✅

4. **Verify in Firestore:**
   - Firebase Console → Firestore Database
   - Navigate to `boards/{boardId}`
   - Expand `columns` array
   - Card should be in Firestore within 1-2 seconds ✅

**Expected Results:**
- ✅ Card created and appears immediately
- ✅ Card syncs to Firebase within 1 second
- ✅ SyncStatus component shows "Syncing" then "Synced"
- ✅ No errors in browser console
- ✅ Card persists after page refresh

---

### Test 2.2: Card Update Sync
**Objective:** Verify card edits sync to Firebase

**Steps:**

1. **Device A:**
   - Open a card for editing
   - Change the title to "Updated Title"
   - Add some notes

2. **Device A:**
   - Click save (or close modal)
   - SyncStatus should show "Syncing" then "Synced"

3. **Verify in Firestore:**
   - Firebase Console → Firestore Database
   - Find the card in `boards/{boardId}/columns/{columnId}/cards`
   - Title should be "Updated Title"
   - Notes should be updated

4. **Device A Refresh:**
   - Refresh the page (Cmd+R)
   - Card should still show updated title and notes

**Expected Results:**
- ✅ Updates appear instantly in app
- ✅ SyncStatus shows sync progress
- ✅ Data persists in Firestore
- ✅ No data loss on refresh

---

### Test 2.3: Real-Time Multi-Device Sync
**Objective:** Verify changes on one device appear on other device in real-time

**Prerequisites:**
- Need board sharing feature (not yet implemented)
- **For now:** We'll manually test the architecture is ready

**Setup for Future Testing:**
Once you implement board sharing:

1. **Device A:**
   - Create board "Shared Board"
   - Share with Device B's account

2. **Device B:**
   - Should see "Shared Board" appear automatically ✅
   - Real-time listener should trigger

3. **Device A:**
   - Create card in "Shared Board"

4. **Device B:**
   - Card should appear automatically within 1-2 seconds
   - No refresh needed ✅

5. **Device B:**
   - Edit the card

6. **Device A:**
   - Edit should appear automatically ✅

**Expected Results:**
- ✅ Changes propagate to all users with access
- ✅ Real-time listeners trigger on both devices
- ✅ No conflicts or merge issues
- ✅ Sync status shows progress on both devices

---

## Test Suite 3: Offline & Sync Recovery

### Test 3.1: Offline Changes
**Objective:** Verify app works offline and syncs when reconnected

**Steps:**

1. **Device A:**
   - Open DevTools (F12)
   - Go to Network tab
   - Set "Online" to "Offline"
   - Try to create a card
   - App should allow local changes (uses localStorage)

2. **Observe:**
   - Card created locally
   - SyncStatus might show "Syncing..." (trying to connect)
   - Changes stored in browser

3. **Set Back Online:**
   - In DevTools Network tab, set back to "Online"
   - Wait 2-3 seconds

4. **Verify Sync:**
   - Changes should sync to Firebase
   - SyncStatus shows "Synced" ✅
   - Check Firebase Console to confirm

**Expected Results:**
- ✅ App works offline (no errors)
- ✅ Local changes stored in localStorage
- ✅ Sync happens automatically when reconnected
- ✅ No data loss
- ✅ SyncStatus reflects connection state

### Test 3.2: Offline Indicator
**Objective:** Verify offline state is visible to user

**Steps:**

1. **Set Offline** (DevTools Network tab)
2. **Observe SyncStatus Component:**
   - Should show appropriate offline indicator
   - Or at least not show "Synced" state

3. **Try Operations:**
   - Creating cards
   - Editing cards
   - Should work (locally) but not sync yet

4. **Set Back Online:**
   - SyncStatus should change
   - Should show "Syncing" then "Synced"

**Expected Results:**
- ✅ User aware of offline state
- ✅ Operations queue for sync
- ✅ Auto-sync on reconnection

---

## Test Suite 4: Migration & Data Integrity

### Test 4.1: Local Board Migration
**Objective:** Verify localStorage boards migrate to Firebase correctly

**Setup:**
- Have some boards in localStorage (before Firebase implementation)

**Steps:**

1. **Create Boards Locally:**
   - Before signing in, create 2-3 boards
   - Add cards to boards
   - Close app

2. **Sign In:**
   - Refresh page
   - Sign in with your Firebase account

3. **Migration Banner:**
   - Should see migration banner at top
   - Shows "You have 3 local board(s) that can be migrated"

4. **Click Migrate:**
   - Click "Migrate Now" button
   - Progress bar shows migration progress
   - Each board uploads

5. **Verify in Firestore:**
   - Firebase Console → Firestore Database
   - Navigate to `boards`
   - Should see your 3 boards
   - Each board should have all cards

6. **Verify in App:**
   - Boards should appear in board switcher
   - Cards should be visible
   - All data intact ✅

**Expected Results:**
- ✅ Migration banner appears
- ✅ Migration completes successfully
- ✅ All boards uploaded to Firebase
- ✅ All cards preserved
- ✅ No data loss
- ✅ Data matches between app and Firestore

---

## Test Suite 5: Error Handling

### Test 5.1: Network Errors
**Objective:** Verify graceful handling of network failures

**Steps:**

1. **Device A:**
   - Start creating a card

2. **Simulate Network Error:**
   - DevTools → Network tab → Offline (mid-operation)

3. **Expected Behavior:**
   - Card created locally
   - SyncStatus shows "Syncing..." (stuck)
   - No error dialog (handled gracefully)

4. **Set Online:**
   - Should retry and sync
   - SyncStatus shows "Synced"

**Expected Results:**
- ✅ No crashes or unhandled errors
- ✅ User sees sync status
- ✅ Auto-retry on connection
- ✅ Data eventually syncs

### Test 5.2: Firebase Errors
**Objective:** Verify app handles Firebase API errors

**Steps:**

1. **Invalid Permissions:**
   - Ensure security rules are deployed
   - Unauthenticated user tries to read boards
   - Should show error (can't access data)

2. **Quota Exceeded (Simulate):**
   - Create 1000+ cards rapidly
   - System should handle gracefully
   - Warn user if quota exceeded

**Expected Results:**
- ✅ Errors handled gracefully
- ✅ User-friendly error messages
- ✅ App doesn't crash
- ✅ Clear indication of issue

---

## Test Checklist

Use this checklist to track your testing progress:

### Authentication & Isolation
- [ ] User can sign in with email/password
- [ ] User can sign in with Google
- [ ] User can create account
- [ ] User isolation works (can't see other user's boards)
- [ ] LoginModal appears when not authenticated
- [ ] Error messages display correctly

### Real-Time Sync
- [ ] Cards sync to Firebase within 1-2 seconds
- [ ] Card updates sync correctly
- [ ] SyncStatus shows "Syncing" then "Synced"
- [ ] Data persists after refresh
- [ ] No data corruption

### Offline & Recovery
- [ ] App works offline (creates cards locally)
- [ ] Changes sync when reconnected
- [ ] SyncStatus reflects offline state
- [ ] No data loss on offline/online transition

### Migration
- [ ] Migration banner appears for local boards
- [ ] Migration completes successfully
- [ ] All boards migrated
- [ ] All cards preserved
- [ ] Data matches between app and Firestore

### Error Handling
- [ ] Network errors handled gracefully
- [ ] Firebase errors handled gracefully
- [ ] No unhandled errors in console
- [ ] User-friendly error messages
- [ ] App doesn't crash

---

## Debugging Tips

### Check Firestore Data
1. Firebase Console → Firestore Database
2. Navigate to `boards` collection
3. Click a board document
4. Expand `columns` array
5. Verify structure matches expectations

### Check Real-Time Listeners
1. Browser DevTools → Console
2. Look for Firebase listener logs
3. Verify listeners attach/detach correctly

### Check Sync Status
1. Look at Header SyncStatus component
2. Should show "Syncing" during updates
3. Should show "Synced" when done
4. Should be hidden when nothing to sync

### Monitor Network Requests
1. Browser DevTools → Network tab
2. Filter by "firestore" or "googleapis"
3. Check requests are being made
4. Verify no 403 (Permission) errors
5. Verify no 500 (Server) errors

### Check Browser Console
1. Browser DevTools → Console
2. Look for errors or warnings
3. Firebase SDK logs (if enabled)
4. App-level errors

---

## Performance Targets

Aim for these performance metrics:

- **Sync Time:** < 2 seconds (goal: < 1 second)
- **Real-Time Updates:** < 2 seconds (goal: < 1 second)
- **Page Load:** < 3 seconds
- **Card Create:** < 1 second (local), < 2 seconds (synced)
- **Card Edit:** < 1 second (local), < 2 seconds (synced)

If you're seeing slower times:
1. Check network speed (might be throttled)
2. Check Firebase quota usage
3. Optimize debounce timing if needed

---

## Known Limitations (for now)

- ✅ Single-user board creation works
- ✅ Data persists in Firebase
- ✅ Real-time listeners set up (architecture ready)
- ❌ Board sharing not yet implemented
- ❌ Can't test multi-user editing same board yet
- ❌ Comments feature not yet added
- ❌ Attachments feature not yet added

Once board sharing is implemented, you'll be able to fully test multi-user real-time collaboration.

---

## Next Steps

After completing all tests:

1. **Fix Any Issues**
   - Document bugs found
   - Fix in code
   - Re-test

2. **Optimize Performance**
   - Measure actual sync times
   - Adjust debounce if needed
   - Optimize queries if slow

3. **Implement Sharing Feature**
   - Add UI to share boards
   - Implement in app
   - Add sharing tests

4. **Go Live**
   - Both users test together
   - Verify real-time collaboration works
   - Monitor for any issues

---

## Support & Troubleshooting

**App not syncing to Firebase?**
- Check security rules are deployed
- Verify user is authenticated
- Check browser console for errors
- Check Firestore quota not exceeded

**Can't see other user's shared board?**
- Verify board sharing feature implemented
- Check `sharedWith` array in Firestore
- Verify security rules allow access

**Real-time updates not appearing?**
- Check real-time listeners attached
- Check network connection
- Check Firestore rules allow read
- Refresh page to verify data loaded

**Data appears corrupted?**
- Check Firestore document structure
- Verify app code handles edge cases
- Check for race conditions
- Review sync logic

---

## Summary

By completing these tests, you'll have verified:
- ✅ Authentication works
- ✅ User isolation is enforced
- ✅ Real-time sync architecture is working
- ✅ Offline support works
- ✅ Data integrity is maintained
- ✅ Error handling is graceful
- ✅ Ready for multi-user collaboration

Your Kanban app is now ready for production use with your partner!
