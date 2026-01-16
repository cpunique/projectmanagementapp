# ToS/Privacy Consent Fix - End-to-End Test Plan

## Overview

This document outlines the complete testing workflow to verify that the ToS/Privacy consent system works correctly after the recent fixes.

## Test Scenario 1: Restore Missing Consent Records

**Objective**: Verify that missing consent records can be restored and the ToS modal no longer appears.

### Prerequisites
- User is logged in but has missing tosConsent/privacyConsent records in Firestore
- ToS modal is appearing and blocking access to the app

### Test Steps

1. **Navigate to Restore Page**
   - Go to `http://localhost:3000/admin/restore-consent`
   - Expected: Page loads without ToS modal appearing (exempt page)
   - Expected: See "Restore ToS/Privacy Consent" heading and restore button
   - ✓ PASS / ✗ FAIL

2. **Click Restore Button**
   - Click "Restore Consent Records" button
   - Expected: Button shows "Restoring..." state
   - Expected: No modal appears during restoration
   - Check console logs for: `[Legal] Restoring missing consent records for user:`
   - ✓ PASS / ✗ FAIL

3. **Verify Successful Restoration**
   - Wait for restoration to complete
   - Expected: Button returns to normal state
   - Expected: Green success message appears with next steps
   - Check console logs for: `[Legal] ✅ VERIFIED: Consent records successfully restored and verified in Firestore`
   - Expected: Message includes: "Successfully restored your ToS/Privacy consent records!"
   - ✓ PASS / ✗ FAIL

4. **Verify Firestore Data**
   - Go to `http://localhost:3000/admin/check-consent`
   - Expected: Page loads without ToS modal appearing (exempt page)
   - Expected: Acceptance Checks section shows:
     - hasAcceptedCurrentToS: true (✓)
     - hasAcceptedCurrentPrivacy: true (✓)
     - Both Accepted: YES (✓)
   - Expected: Raw consent data shows proper tosConsent and privacyConsent objects
   - ✓ PASS / ✗ FAIL

5. **Navigate to Main App**
   - Click on "Kanban Board" link or navigate to `http://localhost:3000/`
   - Expected: **NO ToS modal appears** ⭐ CRITICAL
   - Expected: App loads normally showing boards
   - Check console logs for: `[ToSGate] Navigated away from exempt page, re-checking Firebase consent...`
   - Check console logs for: `[ToSGate] Re-check result: { tosAccepted: true, privacyAccepted: true, stillNeedsAcceptance: false }`
   - ✓ PASS / ✗ FAIL

### Expected Console Output Sequence
```
[Legal] Restoring missing consent records for user: [UID]
[Legal] Creating consent data: { tosConsent: {...}, privacyConsent: {...} }
[Legal] ✅ Firestore write completed for user: [UID]
[Legal] Verifying write by reading back from Firestore...
[Legal] ✅ VERIFIED: Consent records successfully restored and verified in Firestore
[Legal] Restored data verified: { tosVersion: "1.0", privacyVersion: "1.0", needsTermsUpdate: false, acceptedAt: "..." }
```

---

## Test Scenario 2: Persistence After Login/Logout

**Objective**: Verify that the fix persists and ToS modal doesn't reappear after logout and login.

### Prerequisites
- Test Scenario 1 completed successfully
- User has restored consent records

### Test Steps

1. **Log Out**
   - Click logout button in header
   - Expected: User logged out and redirected to login page
   - ✓ PASS / ✗ FAIL

2. **Log Back In**
   - Log in with the same account that was just restored
   - Expected: **NO ToS modal appears** ⭐ CRITICAL
   - Expected: App loads normally showing boards
   - Check AuthContext logs showing consent check passed
   - ✓ PASS / ✗ FAIL

3. **Verify Firestore Data Still Intact**
   - Go to `http://localhost:3000/admin/check-consent`
   - Expected: Acceptance checks still show all true values
   - Expected: Consent data still present in Firestore
   - ✓ PASS / ✗ FAIL

---

## Test Scenario 3: New User Signup with Proper Initialization

**Objective**: Verify that new users get proper consent initialization during signup.

### Prerequisites
- Create a new test email address
- Clear any existing user data for this account

### Test Steps

1. **Navigate to Signup**
   - Go to signup page
   - ✓ PASS / ✗ FAIL

2. **Complete Signup with ToS/Privacy Acceptance**
   - Fill in email and password
   - Check "I agree to the Terms of Service" checkbox
   - Check "I have read and agree to the Privacy Policy" checkbox
   - Submit signup form
   - Expected: Account created successfully
   - Check console logs: `[Legal] ✅ Initialized legal consent for new user:`
   - ✓ PASS / ✗ FAIL

3. **Verify Consent Initialized Correctly**
   - After signup, go to `http://localhost:3000/admin/check-consent`
   - Expected: **NO ToS modal appears** (should not be needed for new users)
   - Expected: Acceptance Checks section shows:
     - hasAcceptedCurrentToS: true (✓)
     - hasAcceptedCurrentPrivacy: true (✓)
   - Expected: needsTermsUpdate: false
   - ✓ PASS / ✗ FAIL

4. **Logout and Login Again**
   - Log out and log back in with the new account
   - Expected: **NO ToS modal appears** ⭐ CRITICAL
   - Expected: App loads normally
   - ✓ PASS / ✗ FAIL

---

## Test Scenario 4: Accept ToS via Modal (Fallback)

**Objective**: Verify that users can still accept ToS via the modal if needed.

### Prerequisites
- Need a user with missing consent or a way to trigger the modal

### Test Steps

1. **Trigger ToS Modal**
   - Navigate to app with a user that has `requiresToSAcceptance: true`
   - Expected: ToS modal appears with "Accept and Continue" button
   - ✓ PASS / ✗ FAIL

2. **Accept ToS via Modal**
   - Click "Accept and Continue" button
   - Expected: Modal closes
   - Expected: App is accessible
   - Check console logs for acceptance recording
   - ✓ PASS / ✗ FAIL

3. **Verify Acceptance Persisted**
   - Go to `http://localhost:3000/admin/check-consent`
   - Expected: Acceptance checks show both true
   - ✓ PASS / ✗ FAIL

---

## Test Scenario 5: Error Handling

**Objective**: Verify that errors are handled gracefully.

### Prerequisites
- Simulate network or Firestore errors (optional, can be done with mock failures)

### Test Steps

1. **Restoration Failure Handling**
   - Navigate to `/admin/restore-consent`
   - Try to restore (if it fails due to permissions/network)
   - Expected: Error message displays clearly
   - Expected: User can retry or get detailed error info
   - ✓ PASS / ✗ FAIL

2. **Check Page Error Handling**
   - Navigate to `/admin/check-consent`
   - Expected: If fetch fails, error message displays
   - Expected: User can retry with refresh button
   - ✓ PASS / ✗ FAIL

---

## Pass/Fail Criteria

### PASS
- All critical tests (marked with ⭐) pass
- ToS modal does not appear after successful restoration
- ToS modal does not appear after logout/login
- New users don't see ToS modal on first login
- Console logs show expected progression

### FAIL
- Any critical test (marked with ⭐) fails
- Errors in console (check for Firestore errors, async issues)
- Unexpected behavior in modal visibility

---

## Debugging Guide

### If ToS Modal Still Appears After Restoration

1. **Check Firestore Data**
   - Go to `/admin/check-consent`
   - Verify tosConsent and privacyConsent exist
   - Verify needsTermsUpdate is false

2. **Check Console Logs**
   - Look for `[ToSGate]` logs when navigating from exempt page
   - Verify `tosAccepted: true` and `privacyAccepted: true` in re-check result
   - If not true, check what versions are in Firestore vs expected

3. **Check AuthContext Cache**
   - Clear browser cache: Cmd+Shift+Delete → Cookies and cached media
   - Logout completely and log back in
   - Verify AuthContext is fetching fresh data

4. **Check needsTermsUpdate Flag**
   - In Firestore console, look at user document
   - Verify needsTermsUpdate field is set to false (not undefined or true)

### If Restoration Verification Fails

1. **Check Firestore Permissions**
   - Verify user has write permissions to their document
   - Check Firestore rules

2. **Check Timestamp Parsing**
   - In console logs, verify timestamps are ISO format
   - Ensure Firestore isn't having issues with the timestamp field

3. **Check Version Numbers**
   - Verify LEGAL_VERSIONS.TERMS_OF_SERVICE and LEGAL_VERSIONS.PRIVACY_POLICY are set correctly
   - These values determine if the acceptance checks pass

---

## Success Checklist

- [ ] Test Scenario 1 (Restore): PASS
- [ ] Test Scenario 2 (Persistence): PASS
- [ ] Test Scenario 3 (New User): PASS
- [ ] Test Scenario 4 (Modal Accept): PASS
- [ ] Test Scenario 5 (Error Handling): PASS
- [ ] No unexpected errors in browser console
- [ ] All console logs match expected progression
- [ ] Modal never appears on exempt pages
- [ ] Modal does not appear after successful restoration

---

## Notes

- All tests should be performed in a clean browser session (no cache)
- Check browser console (F12 > Console tab) for debug logs prefixed with `[Legal]` and `[ToSGate]`
- Firestore data can be inspected in Firebase Console > Firestore Database > users collection
- If tests fail, check the debugging guide before reporting issues
