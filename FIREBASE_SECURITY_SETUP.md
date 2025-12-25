# Firebase Security Rules Setup Guide

## Overview
This guide walks you through deploying production security rules to your Firebase Firestore database. The rules ensure:
- ✅ Only authenticated users can access data
- ✅ Users can only see their own boards (unless shared)
- ✅ Users cannot delete other users' boards
- ✅ Shared boards are accessible to invited users

## Current Status
Your Firebase project is in **test mode** (all reads/writes allowed for 30 days). We need to move to **production mode** with proper security rules.

---

## Step 1: Deploy Security Rules via Firebase Console

### Option A: Deploy via Firebase Console (Recommended for First Time)

1. **Go to Firebase Console**
   - Open [Firebase Console](https://console.firebase.google.com)
   - Select your project: **kanban-collaboration**

2. **Navigate to Firestore Rules**
   - Left sidebar → **Firestore Database**
   - Click **Rules** tab (next to "Data")

3. **Copy the Security Rules**
   - Copy all content from `firestore.rules` file in your project
   - Paste into the Firebase Console editor

4. **Review the Rules**
   - The console shows a preview of what's being changed
   - Look for green checkmarks (allowed operations) and red X (denied)

5. **Publish Rules**
   - Click **Publish** button (top right)
   - Wait for deployment to complete (usually 1-2 minutes)
   - You'll see: "Cloud Firestore Rules successfully updated"

### Option B: Deploy via Firebase CLI (If Installed)

```bash
# Install Firebase CLI globally (one-time)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project (if not already done)
firebase init firestore

# Deploy rules
firebase deploy --only firestore:rules
```

---

## Step 2: Understand the Rules

### Key Rules Explained:

**1. Users Collection**
```javascript
// Users can only read/write their own documents
allow read: if request.auth.uid == userId;
allow create: if request.auth.uid == userId;
```
- Prevents users from seeing each other's data
- Each user has a private document at `/users/{userId}`

**2. Boards Collection - Read**
```javascript
allow read: if canAccessBoard(boardId);
```
- User can read if:
  - They own the board (`ownerId == request.auth.uid`)
  - OR they're in the `sharedWith` array

**3. Boards Collection - Create**
```javascript
allow create: if request.auth.uid == boardId.ownerId &&
              request.resource.data.sharedWith is list;
```
- Prevents users from creating boards owned by others
- Requires `sharedWith` to be an array (prevents errors)

**4. Boards Collection - Update**
```javascript
allow update: if canAccessBoard(boardId);
```
- Users can update boards they own or have access to
- Includes syncing card changes, column updates, etc.

**5. Boards Collection - Delete**
```javascript
allow delete: if isOwner(boardId);
```
- Only the owner can delete a board
- Shared users cannot delete boards

---

## Step 3: Test the Rules

### Test 1: Verify Your Own Board Access

After deploying rules, open your app and:

1. **Create a New Board**
   - Click "New Board" button
   - Name it "Test Board"
   - Should work ✅ (you're the owner)

2. **Edit a Card**
   - Create a card in the board
   - Edit the card title
   - Should work ✅ (you're the owner, rule allows update)

3. **Delete a Card**
   - Delete the card
   - Should work ✅ (you're the owner)

### Test 2: Verify Board Isolation (Different User)

To test that users can't access other users' boards:

1. **Open Incognito Window/Different Browser**
   - Open your Kanban app in a new private window
   - Sign in with a **different email** (your partner's account)
   - This creates a different UID

2. **Verify Can't See First User's Boards**
   - The new user should see NO boards (or just their own)
   - They cannot access the first user's board data
   - If they try to access it directly via URL, Firestore will deny ✅

3. **Create Board with Second Account**
   - Create a board with the second account
   - Go back to first account
   - Should NOT see the second user's board ✅

### Test 3: Verify Shared Board Access (Coming Soon)

Once you implement board sharing feature:

1. **Share a Board**
   - First user shares their board with second user's email
   - This adds second user's UID to `sharedWith` array

2. **Second User Gets Access**
   - Second user can now see and edit the shared board ✅
   - Second user can see cards, columns, etc. ✅

3. **Verify Second User Can't Delete**
   - Second user tries to delete the board
   - Firestore denies (not owner) ✅

---

## Step 4: Monitor Rule Usage

### View Rule Performance

1. **Go to Firestore Dashboard**
   - Firebase Console → Firestore Database
   - Click **Rules** tab

2. **Check Request Metrics**
   - Each request shows which rules were evaluated
   - Green = allowed, Red = denied

### Common Issues & Fixes

**Issue: "Permission denied" when creating boards**
```
❌ Error: Missing or insufficient permissions
```

**Solution:**
- Check that `sharedWith: []` is being sent when creating boards
- Verify your board creation code includes:
  ```javascript
  const newBoard = {
    id: nanoid(),
    name,
    ownerId: user.uid,  // ✅ Must match current user
    sharedWith: [],      // ✅ Must be a list
    columns: [ ... ]
  };
  ```

**Issue: "Permission denied" when reading boards**
```
❌ Error: Missing or insufficient permissions
```

**Solution:**
- Verify the board exists in Firestore
- Check the board's `ownerId` matches current user's UID
- Or check board's `sharedWith` includes current user's UID

---

## Step 5: Production Checklist

Before going live with your partner:

- [ ] Security rules deployed to Firebase
- [ ] Tested board creation with authenticated user
- [ ] Tested board editing works
- [ ] Tested board deletion works (owner only)
- [ ] Tested with second account (can't see first user's boards)
- [ ] Tested sync status indicator shows "Synced"
- [ ] Migration tool successfully migrates boards
- [ ] Real-time updates working (edits sync between devices)

---

## Rollback (If Needed)

If something breaks after deploying rules:

1. **Temporary Rollback to Test Mode**
   - Firebase Console → Firestore Database → Rules
   - Replace all rules with:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.time < timestamp.date(2025, 12, 31);
       }
     }
   }
   ```
   - This allows everything until Dec 31, 2025 (test mode)
   - Click Publish

2. **Investigate the Issue**
   - Check browser console for errors
   - Check Firestore rule evaluations in Firebase Console
   - Fix your app code if needed

3. **Redeploy Fixed Rules**
   - Once fixed, deploy proper rules again

---

## Next Steps

After rules are deployed:

1. **Phase 5: Testing**
   - Test multi-user scenarios with your partner
   - Verify real-time sync works between two browsers
   - Test offline mode and sync when reconnected

2. **Future Features**
   - Board sharing (invite specific users)
   - Comments on cards (uses nested `comments` collection)
   - Attachments (uses nested `attachments` collection)
   - Permissions levels (view-only, edit, admin)

---

## Support

If you encounter issues:

1. **Check Firebase Console Logs**
   - Firebase Console → Firestore Database → Rules
   - Review request details

2. **Common Rule Errors**
   - `Missing or insufficient permissions` → User doesn't have access
   - `Document validation failed` → Data structure incorrect
   - `Function undefined` → Typo in helper function name

3. **Test Your Data Structure**
   - Ensure all boards have: `id`, `name`, `ownerId`, `sharedWith`, `columns`
   - Ensure `sharedWith` is an array (even if empty)

---

## Security Best Practices Applied

✅ **Principle of Least Privilege**
- Users can only access their own data by default
- Must explicitly grant access (sharing)

✅ **Defense in Depth**
- Rules on server (Firestore)
- Auth check in app (AuthContext)
- Multiple validation layers

✅ **Deny by Default**
- Final catch-all rule: `allow read, write: if false`
- Only explicitly allowed operations work

✅ **Data Validation**
- Rules check data structure (`sharedWith is list`)
- Prevents malformed documents

✅ **Immutable Ownership**
- `ownerId` set at creation, cannot be changed by rules
- Prevents privilege escalation
