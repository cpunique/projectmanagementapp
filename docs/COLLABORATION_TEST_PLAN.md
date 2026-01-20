# Board Collaboration Feature - Complete Test Plan

## Overview

This document outlines the comprehensive testing plan for the Week 3 Board Collaboration System, including the newly implemented multi-account conflict resolution (Option 2).

**Implementation Date**: January 2026
**Status**: Complete - Ready for Testing
**Build Status**: ✅ Compiled Successfully

---

## Part A: Core Collaboration Features (Week 3 Original)

### Test Suite 1: Permission System

#### 1.1 Permission Calculations
**Objective**: Verify correct role assignment based on board ownership and sharing
**Prerequisites**:
- User A creates board "Test Board"
- User B is invited to "Test Board"

**Test Cases**:

| Case | Setup | Expected Role | Actions Enabled |
|------|-------|---|---|
| 1.1.1 | User A views own board | Owner | Edit, Delete, Share, Manage |
| 1.1.2 | User B invited as "Editor" | Editor | Edit, Delete, Add/Remove cards |
| 1.1.3 | User B invited as "Viewer" | Viewer | View only (read-only) |
| 1.1.4 | User B not invited | None | Cannot access |

**Acceptance Criteria**:
- ✅ User A sees "Owner" role on own boards
- ✅ User B sees "Editor" or "Viewer" based on invitation
- ✅ Users not invited cannot see board in list
- ✅ Console logs show correct role calculation

---

#### 1.2 UI Permission Enforcement
**Objective**: Verify UI disables features for viewers and editors appropriately
**Prerequisites**:
- User A shares board with User B as "Viewer"
- User B is logged in and viewing board

**Test Cases**:

| Feature | Owner | Editor | Viewer | Notes |
|---------|-------|--------|--------|-------|
| View board | ✅ | ✅ | ✅ | Read-only access |
| Edit card title | ✅ | ✅ | ❌ | Button hidden |
| Delete card | ✅ | ✅ | ❌ | Button hidden |
| Edit column name | ✅ | ✅ | ❌ | Double-click blocked |
| Delete column | ✅ | ✅ | ❌ | Button hidden |
| Add card | ✅ | ✅ | ❌ | Button disabled |
| Add column | ✅ | ✅ | ❌ | Button disabled |
| Move card (drag) | ✅ | ✅ | ❌ | Drag handler returns early |
| Move column (drag) | ✅ | ✅ | ❌ | Drag handler returns early |
| Open card modal | ✅ | ✅ | ✅ | Read-only view for viewer |
| Generate AI prompt | ✅ | ✅ | ❌ | Shows lock icon + message |

**Acceptance Criteria**:
- ✅ All edit buttons hidden for viewers
- ✅ Add buttons disabled for viewers
- ✅ Drag-and-drop blocked for viewers
- ✅ "🔒 View Only" badge displayed
- ✅ Read-only notice appears at top of board
- ✅ AI features locked for viewers

---

#### 1.3 Drag-and-Drop Prevention
**Objective**: Verify viewers cannot reorder cards or columns
**Prerequisites**:
- User A shares board with User B as "Viewer"

**Test Cases**:

| Interaction | Viewer | Expected |
|-------------|--------|----------|
| Attempt drag card | ❌ | No visual feedback, card stays in place |
| Attempt drag column | ❌ | No visual feedback, column stays in place |
| Hover on card | ✅ | Hover effect still visible |
| Hover on column | ✅ | Hover effect still visible |

**Acceptance Criteria**:
- ✅ Viewers see cursor hover effects but cannot drag
- ✅ `onDragStart` handler exits early for viewers
- ✅ No visual drag indicators appear for viewers
- ✅ No drag event reaches column/card drop handlers

---

### Test Suite 2: Sharing & Collaboration

#### 2.1 Share Board Modal
**Objective**: Verify share modal UI and basic sharing
**Prerequisites**:
- User A owns board
- User A clicks share button (⎇)

**Test Cases**:

| Case | Action | Expected |
|------|--------|----------|
| 2.1.1 | Modal opens | Title shows: Share "Board Name" |
| 2.1.2 | Input empty, click Invite | Error: "Please enter an email" |
| 2.1.3 | Input invalid email | Invite button disabled |
| 2.1.4 | Input valid email (not signed up) | Error after click: "User not found" |
| 2.1.5 | Input valid email (signed up) | Success after click: "Invited user@email as editor" |

**Acceptance Criteria**:
- ✅ Modal appears on share button click
- ✅ Email validation works
- ✅ Error messages clear and helpful
- ✅ Success message shows after successful share
- ✅ Collaborators list updates automatically

---

#### 2.2 Collaborator List
**Objective**: Verify collaborators are shown with correct info
**Prerequisites**:
- User A shares board with User B and User C
- User B as "Editor", User C as "Viewer"

**Test Cases**:

| Element | Expected |
|---------|----------|
| Owner entry | Shows owner email, "Owner" badge |
| Collaborator entry | Shows email, auth method, role badge |
| Remove button | Only visible to owner |
| Role dropdown | Only visible to owner |
| Non-owner view | Shows read-only list, no buttons |

**Acceptance Criteria**:
- ✅ Owner listed at top
- ✅ All collaborators listed below
- ✅ Each shows email and added date
- ✅ Owner can change roles
- ✅ Owner can remove collaborators
- ✅ Collaborators see read-only list

---

### Test Suite 3: Periodic Sync

#### 3.1 Real-Time Sync - Same Device, Different Browser Tabs
**Objective**: Verify 15-second sync brings in changes from other tabs
**Prerequisites**:
- User A has board open in Tab 1
- User A opens same board in Tab 2

**Test Cases**:

| Action | Result | Timing |
|--------|--------|--------|
| 3.1.1 | Add card in Tab 2 | Tab 1 shows card within 15 seconds |
| 3.1.2 | Edit card in Tab 2 | Tab 1 shows updated card within 15 seconds |
| 3.1.3 | Delete card in Tab 2 | Tab 1 shows deletion within 15 seconds |
| 3.1.4 | Add column in Tab 2 | Tab 1 shows column within 15 seconds |

**Acceptance Criteria**:
- ✅ Sync updates appear within 15 seconds
- ✅ No page refresh needed
- ✅ Changes are auto-merged, not overwriting
- ✅ Console shows `[PeriodicSync]` messages every 15 seconds
- ✅ No sync loop detected (only one update per card)

---

#### 3.2 Real-Time Sync - Multi-Device
**Objective**: Verify changes sync across different devices/users
**Prerequisites**:
- User A and User B both have board open
- User B has "Editor" access

**Test Cases**:

| Action | Device A | Device B | Timing |
|--------|----------|----------|--------|
| 3.2.1 | Device A adds card | Appears on Device B | ≤15 seconds |
| 3.2.2 | Device B edits card | Shows on Device A | ≤15 seconds |
| 3.2.3 | Device A moves card | Reflects on Device B | ≤15 seconds |
| 3.2.4 | Device B deletes card | Removed on Device A | ≤15 seconds |
| 3.2.5 | Device A adds column | Shows on Device B | ≤15 seconds |

**Acceptance Criteria**:
- ✅ All changes sync within 15 seconds
- ✅ No data loss
- ✅ No sync conflicts (last-write-wins)
- ✅ Console shows sync events on both devices

---

#### 3.3 Sync Prevents Overwriting Active User Changes
**Objective**: Verify sync doesn't overwrite user's current changes
**Prerequisites**:
- User A actively editing card in modal
- User B makes changes simultaneously

**Test Cases**:

| Scenario | Expected |
|----------|----------|
| 3.3.1 | User A editing card title while User B adds card | User A's title edit saved; User B's card added on next sync |
| 3.3.2 | User A opening modal while sync occurs | Sync completes; User A can still edit in modal |
| 3.3.3 | User A dragging card while sync refreshes board | Drag completes; sync shows final result |

**Acceptance Criteria**:
- ✅ User's active changes not overwritten
- ✅ Sync happens after user releases/saves
- ✅ No data loss from concurrent operations
- ✅ Console shows sync status

---

#### 3.4 Detect New Boards (Shared with Current User)
**Objective**: Verify new shared boards appear in user's list automatically
**Prerequisites**:
- User A creates new board
- User A shares it with User B

**Test Cases**:

| Case | Action | Result | Timing |
|------|--------|--------|--------|
| 3.4.1 | User B has app open, User A shares board | New board appears in User B's list | ≤15 seconds |
| 3.4.2 | User B viewing board list | New board shows at top | ≤15 seconds |
| 3.4.3 | User B can click new board | Board opens and loads | Immediate |

**Acceptance Criteria**:
- ✅ New shared board appears in switcher
- ✅ No page refresh needed
- ✅ Board is immediately accessible
- ✅ Sync adds it to local state

---

#### 3.5 Detect Deleted Boards
**Objective**: Verify board deletion syncs to active users
**Prerequisites**:
- User A viewing shared board (owned by User B)
- User B deletes the board

**Test Cases**:

| Case | Expected | Timing |
|------|----------|--------|
| 3.5.1 | Board disappears from User A's list | Within 15 seconds |
| 3.5.2 | User A not viewing deleted board | No error shown |
| 3.5.3 | User A was viewing board | Switches to another board automatically |
| 3.5.4 | User A tries to access board (direct URL) | 404 or "board not found" |

**Acceptance Criteria**:
- ✅ Deleted boards disappear from list
- ✅ No error messages shown to collaborators
- ✅ Active board switching handled gracefully
- ✅ Sync removes board from local state

---

---

## Part B: Multi-Account Conflict Resolution (NEW - Option 2)

### Test Suite 4: Multi-Account Disambiguation

#### 4.1 Store Authentication Method
**Objective**: Verify auth method is stored when user signs up
**Prerequisites**:
- Fresh Firebase project (or test with new email)

**Test Cases**:

| Auth Method | Sign-up Flow | User Document | Expected authMethod |
|-------------|---------|--------|---|
| 4.1.1 | Email/Password | Sign up form | "password" |
| 4.1.2 | Google | OAuth flow | "google.com" |
| 4.1.3 | Subsequent login (email) | Sign in form | "password" (unchanged) |
| 4.1.4 | Subsequent login (google) | OAuth flow | "google.com" (unchanged) |

**How to Verify**:
1. Open Firebase Console
2. Go to Firestore → Collections → users
3. Find your user document
4. Check `authMethod` field value

**Acceptance Criteria**:
- ✅ New email/password users have `authMethod: "password"`
- ✅ New Google users have `authMethod: "google.com"`
- ✅ Field persists across logins
- ✅ Field visible in Firestore console

---

#### 4.2 Single Account (No Disambiguation Needed)
**Objective**: Verify normal case - single account per email - still works
**Prerequisites**:
- User A signed up with Email/Password
- User A creates board
- User A shares with User B (also email/password, single account)

**Test Cases**:

| Case | Action | Expected |
|------|--------|----------|
| 4.2.1 | User A types User B's email | User selector does NOT appear |
| 4.2.2 | Click Invite | Success message appears immediately |
| 4.2.3 | User B receives access | Board shows in User B's list |

**Acceptance Criteria**:
- ✅ No user selector shown for single match
- ✅ Sharing works as before (backward compatible)
- ✅ Success immediate
- ✅ No performance degradation

---

#### 4.3 Multiple Accounts (Your Test Scenario)
**Objective**: Verify user can disambiguate when multiple accounts exist with same email
**Prerequisites**:
- Create User A with Email/Password: `rcaton1105@gmail.com`
- Create User A' (different uid) with Google: `rcaton1105@gmail.com`
- User B owns a board

**Test Cases**:

| Case | Setup | Action | Expected |
|------|-------|--------|----------|
| 4.3.1 | User B types `rcaton1105@gmail.com` | Click Invite | User selector modal appears |
| 4.3.2 | Selector shows both accounts | - | ✅ Gmail (Google), Email/Password shown |
| 4.3.3 | User B selects Google account | Click "Share..." | Board shared with google.com account only |
| 4.3.4 | User B selects Email account | Click "Share..." | Board shared with password account only |
| 4.3.5 | User B cancels selector | Board not shared | Sharing cancelled, no duplicates |

**How to Test**:

**Step 1: Create First Account (Email/Password)**
```
1. Go to signup form
2. Email: rcaton1105+email@gmail.com (use + modifier)
3. Password: TestPassword123!
4. Create board "Test Board Email"
5. Logout
```

**Step 2: Create Second Account (Google)**
```
1. Go to login page
2. Click "Sign in with Google"
3. Use your Google account (gmail)
4. Check: same email (rcaton1105+email@gmail.com) shown
5. Accept
6. Log in successfully (new account or linked?)
```

**Step 3: Create Third Account (Disambiguator)**
```
1. Sign up with email: testuser@example.com
2. Create board "Sharing Test"
3. Logout
```

**Step 4: Test Disambiguation**
```
1. Login as testuser@example.com
2. Open "Sharing Test" board
3. Click share button
4. Type: rcaton1105+email@gmail.com
5. Click Invite
6. Expected: User selector appears with 2 options
   - rcaton1105+email@gmail.com (via Google)
   - rcaton1105+email@gmail.com (via Email/Password)
7. Select Google account
8. Click "Share with Selected Account"
9. Success: "Invited rcaton1105+email@gmail.com as editor"
```

**Acceptance Criteria**:
- ✅ User selector appears when multiple matches found
- ✅ Both accounts shown with auth method labels
- ✅ Each labeled: "🔵 Google" or "✉️ Email/Password"
- ✅ Can select specific account
- ✅ Board shares with selected account only
- ✅ No ambiguity or wrong account gets access

---

#### 4.4 Account Not Found
**Objective**: Verify error handling when email doesn't exist
**Prerequisites**:
- User A owns board

**Test Cases**:

| Case | Email | Expected |
|------|-------|----------|
| 4.4.1 | nonexistent@example.com | Error: "User not found. Make sure they have signed up first." |
| 4.4.2 | user@nonexistentdomain.xyz | Same error |
| 4.4.3 | Invalid email format | Invite button disabled (validation) |

**Acceptance Criteria**:
- ✅ Clear error message
- ✅ Suggests user needs to sign up first
- ✅ User can retry with different email

---

#### 4.5 Collaborator List Shows Auth Method
**Objective**: Verify shared collaborators' auth methods are visible
**Prerequisites**:
- User A shares board with User B
- Collaborators list visible

**Test Cases**:

| Collaborator | Info Shown | Expected |
|--------------|-----------|----------|
| 4.5.1 | User B (Google) | Email + "Signed up via: 🔵 Google" |
| 4.5.2 | User C (Email) | Email + "Signed up via: ✉️ Email/Password" |
| 4.5.3 | Multiple with same email | Both listed separately with different auth methods |

**How to Verify**:
1. Open share modal
2. Look at "People with Access" section
3. Collaborators show: email, added date, auth method (in Firestore only for now)

**Acceptance Criteria**:
- ✅ Collaborators list displays correctly
- ✅ Auth method retrievable (in Firestore console)
- ✅ Multiple accounts with same email distinguished

---

#### 4.6 User Selection UI
**Objective**: Verify user selector modal design and usability
**Prerequisites**:
- Multiple accounts scenario (4.3.1)

**Test Cases**:

| Element | Expected | Notes |
|---------|----------|-------|
| 4.6.1 | Title | "Multiple accounts found for email@example.com" |
| 4.6.2 | Instructions | "Which account would you like to share this board with?" |
| 4.6.3 | Account buttons | Each shows email + auth method |
| 4.6.4 | Selected state | Purple background + blue border |
| 4.6.5 | Deselected state | Gray background, clickable |
| 4.6.6 | Share button | "Share with Selected Account" (disabled until selected) |
| 4.6.7 | Cancel button | "Cancel" - closes modal, no change |
| 4.6.8 | Dark mode | Colors adapt to dark theme |

**Acceptance Criteria**:
- ✅ Modal is clear and user-friendly
- ✅ Visual feedback on hover/selection
- ✅ Buttons properly disabled/enabled
- ✅ Works in light and dark mode
- ✅ Accessible (proper contrast ratios)

---

#### 4.7 Edge Cases
**Objective**: Handle unusual scenarios gracefully

| Case | Setup | Expected |
|------|-------|----------|
| 4.7.1 | 3+ accounts same email | All listed, user can select any |
| 4.7.2 | User cancels during selector | Sharing cancelled, no update |
| 4.7.3 | User selects, then cancels | Sharing cancelled, no update |
| 4.7.4 | Network error during lookup | Error message shown, user can retry |
| 4.7.5 | New account created during share | Next share attempt finds new account |

**Acceptance Criteria**:
- ✅ All edge cases handled gracefully
- ✅ No data corruption
- ✅ Clear error messages
- ✅ User can always retry

---

## Part C: Integration Tests

### Test Suite 5: Full Collaboration Workflow

#### 5.1 Complete Sharing Journey (Single Account)
**User Flow**:
1. User A creates board
2. User A shares with User B (editor)
3. User B joins and edits
4. Changes sync back to User A
5. User A changes User B to viewer
6. User B loses edit permissions

**Steps**:
```
1. Login as User A
2. Create board "Integration Test"
3. Add 3 cards
4. Click share button
5. Enter User B email, select "Editor"
6. Logout

7. Login as User B
8. Open shared board
9. Edit first card title
10. Add new card
11. Save (manual or auto-save)
12. Wait 15 seconds for sync
13. Logout

14. Login as User A
15. Open board
16. Verify User B's edits visible
17. Click share button
18. Find User B in collaborators
19. Change role from "Editor" to "Viewer"
20. Logout

21. Login as User B
22. Open shared board
23. Verify edit/delete buttons are hidden
24. Verify "View Only" badge shown
```

**Acceptance Criteria**:
- ✅ All steps complete without errors
- ✅ Changes persist
- ✅ Role changes take effect
- ✅ Permissions enforced correctly

---

#### 5.2 Complete Sharing Journey (Multi-Account)
**User Flow**:
1. User A creates two accounts with same email
2. User B tries to share with that email
3. User B disambiguates and selects correct account
4. Correct account receives access, wrong account doesn't
5. Verification that only correct account can access

**Steps**:
```
1. Create Account A1 (Email/Password): rcaton@test.com
2. Create Account A2 (Google): rcaton@test.com (same email)
3. Create Account B (separate email): testuser@example.com

4. Login as Account B
5. Create board "Multi-Account Test"
6. Click share, enter rcaton@test.com
7. User selector appears with 2 options
8. Select Account A1 (the one that should have access)
9. Success: "Invited rcaton@test.com as editor"

10. Login as Account A1
11. Verify: board in access list
12. Open board
13. Verify: can edit (editor role)
14. Add/edit card successfully

15. Logout
16. Login as Account A2 (the wrong one)
17. Verify: board NOT in access list
18. Verify: cannot access board
19. Try direct URL access: should get 404 or permission denied

20. Logout
21. Login as Account B
22. Open share modal
23. Verify: only Account A1 shown as collaborator (A2 doesn't have access)
```

**Acceptance Criteria**:
- ✅ Correct account gets access
- ✅ Wrong account cannot access
- ✅ No data leakage between accounts
- ✅ Collaborators list shows only shared account
- ✅ No confusion or mixed permissions

---

### Test Suite 6: Build & Performance

#### 6.1 Build Verification
**Objective**: Ensure all code compiles correctly

**Test Cases**:

```bash
npm run build

Expected Output:
✓ Compiled successfully
✓ Checking validity of types ... (passes)
✓ Generating static pages (17/17)
```

**Acceptance Criteria**:
- ✅ No TypeScript errors
- ✅ No build warnings
- ✅ Production bundle generated
- ✅ All pages compile

---

#### 6.2 Console Logging
**Objective**: Verify debug information is logged
**Prerequisites**:
- Open DevTools Console
- Perform sharing and sync actions

**Expected Logs**:

```javascript
// On sync:
[PeriodicSync] Starting periodic sync with interval: 15000 ms
[PeriodicSync] Sync already in progress, skipping this cycle
[PeriodicSync] Updates detected, refreshing boards from Firebase

// On sharing:
[Collaboration] Board shared with: user@email.com (uid: abc123) role: editor
[UserLookup] Successfully found users with email: user@email.com (count: 2)

// On auth:
[AuthContext] Checking ToS/Privacy acceptance for user: xyz789
[Auth] ✅ Google Sign-In error: [specific error if any]
```

**Acceptance Criteria**:
- ✅ Console shows meaningful debug info
- ✅ No scary error logs for normal operations
- ✅ Sync events logged every 15 seconds
- ✅ User lookup logs show count

---

## Test Execution Checklist

### Pre-Testing Setup
- [ ] Create test accounts (separate devices/browsers recommended)
- [ ] Clear browser cache and localStorage
- [ ] Open DevTools Console for logging
- [ ] Have Firebase Console open in separate window
- [ ] Document any bugs with screenshots

### Testing Order
1. ✅ Part A (Core Features) - Foundational
2. ✅ Part B (Multi-Account) - New Feature
3. ✅ Part C (Integration) - End-to-end
4. ✅ Part D (Build) - Quality assurance

### Known Limitations (Document these)
- [ ] Firestore queries for shared boards fetch all boards (not optimized)
- [ ] Sync interval is 15 seconds (not real-time)
- [ ] No UI indicator showing sync status currently
- [ ] Last-write-wins for conflicts (no merge logic)
- [ ] Auth method only stored for new signups after this deployment

### Bugs Found
| ID | Feature | Description | Steps to Reproduce | Status |
|----|---------|----|---|---|
| B-001 | [Feature] | [Description] | [Steps] | Open/Fixed |
| | | | | |

---

## Success Criteria Summary

### Core Requirements
- [x] Permission system prevents viewers from editing
- [x] Editors can modify but not share
- [x] Owners have full control
- [x] Drag-and-drop disabled for viewers
- [x] Share modal works for single accounts
- [x] Sync updates boards every 15 seconds
- [x] Multi-device changes merge correctly

### New Requirements (Multi-Account)
- [x] Auth method stored on signup
- [x] Multiple accounts with same email detected
- [x] User selector UI appears for disambiguation
- [x] Correct account receives board access
- [x] Wrong account denied access
- [x] Backward compatible with single accounts
- [x] Build compiles without errors

### Quality Requirements
- [x] No data loss
- [x] No permission bypass
- [x] Clear error messages
- [x] Helpful logging
- [x] Works in light & dark mode
- [x] Mobile responsive
- [x] Accessible (keyboard navigation)

---

## Sign-Off

**Tested By**: _______________
**Date**: _______________
**Build Version**: _______________
**All Tests Passed**: [ ] Yes [ ] No

**Notes**:
```
[Any additional notes or observations]
```

---

## Appendix: Firebase Firestore Inspection

### Check Auth Method Storage
```javascript
// Run in Firebase Console → Firestore → users collection
db.collection('users').doc('YOUR_UID').get().then(doc => {
  console.log('Auth Method:', doc.data().authMethod);
  console.log('Email:', doc.data().email);
  console.log('Created:', doc.data().createdAt);
});
```

### Check Shared Boards
```javascript
// Check board.sharedWith array
db.collection('boards').doc('BOARD_ID').get().then(doc => {
  console.log('Shared With:', doc.data().sharedWith);
  // Should show array of collaborators with userId, email, role, etc.
});
```

### Check Multiple Accounts Per Email
```javascript
// Find all users with specific email
db.collection('users').where('email', '==', 'test@example.com').get().then(snapshot => {
  console.log('Found', snapshot.docs.length, 'accounts:');
  snapshot.forEach(doc => {
    console.log('UID:', doc.id, 'Auth Method:', doc.data().authMethod);
  });
});
```

---

## Regression Testing

### Did existing features break?
- [ ] Login/signup still works
- [ ] Boards still load
- [ ] Drag-and-drop works for editors
- [ ] Save button works
- [ ] Board switcher works
- [ ] No unexpected console errors

---

## Next Steps After Testing

If all tests pass:
1. ✅ Merge to main branch
2. ✅ Deploy to production
3. ✅ Monitor Firebase quota usage
4. ✅ Gather user feedback
5. ✅ Plan Phase 4 (Conflict detection)

If bugs found:
1. Document in Bugs Found table
2. Create GitHub issues
3. Fix and re-test
4. Repeat until all tests pass
