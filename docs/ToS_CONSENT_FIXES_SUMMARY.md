# ToS/Privacy Consent System - Fixes Summary

## Problem Statement

Users' accounts were missing Terms of Service and Privacy Policy consent records in Firestore, causing a persistent "Terms of Service Update Required" modal that blocked access to the application. The modal would reappear even after users attempted to accept the terms.

### Symptoms
- ToS/Privacy modal blocks access to main app
- Modal reappears after page refresh or logout/login
- Console logs showed missing consent data: `tosVersion: undefined, privacyVersion: undefined`
- Even after restoration, modal would still appear when navigating from admin pages

### Root Causes
1. **Missing Consent Records**: Older user accounts created before the legal consent system was fully implemented
2. **Improper needsTermsUpdate Flag**: Missing or incorrectly set `needsTermsUpdate` field preventing acceptance checks from passing
3. **Stale Auth State Cache**: AuthContext cached `requiresToSAcceptance` at login and never re-evaluated
4. **No Verification Logic**: No way to confirm Firestore writes actually succeeded

---

## Solutions Implemented

### Fix 1: Restore Missing Consent Records

**File**: `lib/firebase/legal.ts`

**Function**: `restoreMissingConsent(userId: string)`

**What It Does**:
- Creates new tosConsent and privacyConsent records with correct version numbers
- Sets `needsTermsUpdate: false` to allow acceptance checks to pass
- Includes 1-second delay for Firestore sync
- **Verifies the write succeeded by reading back from Firestore**
- Throws descriptive error if verification fails

**Key Features**:
```typescript
// Creates consent records with proper version tracking
const tosConsent = createConsentRecord(
  LEGAL_VERSIONS.TERMS_OF_SERVICE,
  'checkbox',
  ipAddress
);

const privacyConsent = createConsentRecord(
  LEGAL_VERSIONS.PRIVACY_POLICY,
  'checkbox',
  ipAddress
);

// Writes to Firestore with merge to preserve other fields
await setDoc(userRef, {
  tosConsent,
  privacyConsent,
  needsTermsUpdate: false,  // ← Critical: must be false
  updatedAt: new Date().toISOString(),
}, { merge: true });

// Verifies write succeeded
const verified = await getUserLegalConsent(userId);
if (!verified?.tosConsent || !verified?.privacyConsent) {
  throw new Error('Consent restoration verification failed');
}
```

**Testing**: Users can access `/admin/restore-consent` to restore their consent records

---

### Fix 2: Improve needsTermsUpdate Flag Handling

**File**: `lib/firebase/legal.ts`

**Changes**:
1. **initializeUserLegalConsent()** - Now explicitly sets `needsTermsUpdate` flag based on acceptedToS and acceptedPrivacy parameters:
   ```typescript
   userData.needsTermsUpdate = !(acceptedToS && acceptedPrivacy);
   ```
   This ensures new users don't see the modal if they accepted during signup.

2. **recordToSAcceptance()** - Sets `needsTermsUpdate: false` when recording acceptance:
   ```typescript
   await setDoc(userRef, {
     tosConsent: consent,
     needsTermsUpdate: false,  // ← Critical
     updatedAt: new Date().toISOString(),
   }, { merge: true });
   ```

3. **hasAcceptedCurrentToS()** - Checks the needsTermsUpdate flag as part of acceptance validation:
   ```typescript
   const accepted =
     consent?.tosConsent?.version === LEGAL_VERSIONS.TERMS_OF_SERVICE &&
     !consent?.needsTermsUpdate;  // ← Must be false
   ```

**Impact**: Ensures that `needsTermsUpdate` flag cannot be undefined or accidentally left true

---

### Fix 3: Hide Modal on Admin Pages

**File**: `components/legal/ToSGateWrapper.tsx`

**Changes**:
1. Added `usePathname()` hook to detect current page
2. Added exemption list for admin tools:
   ```typescript
   const exemptPages = [
     '/admin/restore-consent',
     '/admin/check-consent',
   ];
   ```

3. Added conditional rendering to hide modal on exempt pages:
   ```typescript
   // Check if user is on an exempt page
   const isExempt = exemptPages.some(page => pathname?.startsWith(page));

   // Don't show modal if user is on exempt page
   if (user && actualRequiresAcceptance && !isExempt) {
     return (
       <>
         {children}
         <ToSGateModal {...} />
       </>
     );
   }
   ```

**Impact**: Users can access admin tools without being blocked by the modal

---

### Fix 4: Re-Check Consent When Navigating Away from Exempt Pages

**File**: `components/legal/ToSGateWrapper.tsx`

**Changes**: Added dynamic re-checking logic that:
1. Detects when user navigates away from exempt pages
2. Fetches fresh consent data from Firestore
3. Updates local state based on real data
4. Calls `markToSAccepted()` if consent was restored
5. **Immediately hides modal on exempt pages** (doesn't wait for async check)

```typescript
useEffect(() => {
  if (!user) {
    setActualRequiresAcceptance(false);
    return;
  }

  const isExempt = exemptPages.some(page => pathname?.startsWith(page));

  // When leaving an exempt page, re-check Firebase
  if (!isExempt && requiresToSAcceptance) {
    console.log('[ToSGate] Navigated away from exempt page, re-checking Firebase consent...');
    (async () => {
      const [tosAccepted, privacyAccepted] = await Promise.all([
        hasAcceptedCurrentToS(user.uid),
        hasAcceptedCurrentPrivacy(user.uid),
      ]);
      const stillNeedsAcceptance = !(tosAccepted && privacyAccepted);

      setActualRequiresAcceptance(stillNeedsAcceptance);

      if (!stillNeedsAcceptance) {
        markToSAccepted();  // Update AuthContext cache
      }
    })();
  } else if (isExempt) {
    // On exempt pages, immediately hide modal
    setActualRequiresAcceptance(false);
  } else if (!requiresToSAcceptance) {
    setActualRequiresAcceptance(false);
  }
}, [pathname, user, requiresToSAcceptance, markToSAccepted]);
```

**Key Points**:
- `actualRequiresAcceptance` is separate from `requiresToSAcceptance` to override cached state
- Immediate state update on exempt pages prevents modal flash
- Async re-check runs in background when navigating away
- `markToSAccepted()` call updates AuthContext cache to prevent modal from reappearing

**Impact**: Users never see the modal on restore/check pages, and consent status is re-verified when leaving those pages

---

### Fix 5: Enhanced Error Handling in AuthContext

**File**: `lib/firebase/AuthContext.tsx`

**Changes**:
1. Added try/catch around `initializeUserLegalConsent()` in signup flows
2. If legal consent initialization fails, signup still succeeds (user can restore manually later)
3. Added detailed error logging

**Impact**: Signup process doesn't fail if legal consent initialization encounters issues

---

### Fix 6: Diagnostic Tools for Users and Developers

**Files Created**:
1. **`app/admin/restore-consent/page.tsx`** - Restoration tool
   - Users can click a button to restore missing consent records
   - Shows success/error messages
   - Calls `restoreMissingConsent()` and `markToSAccepted()`
   - Provides next steps instructions

2. **`app/admin/check-consent/page.tsx`** - Diagnostic tool
   - Shows acceptance check results (hasAcceptedCurrentToS, hasAcceptedCurrentPrivacy)
   - Displays raw Firestore consent data
   - Shows expected values for comparison
   - Helps diagnose why checks are failing

**Impact**: Users can self-diagnose and restore without developer intervention

---

## Console Logging for Debugging

All legal consent operations include detailed logging with `[Legal]` prefix:

### Successful Restoration
```
[Legal] Restoring missing consent records for user: abc123
[Legal] Creating consent data: { tosConsent: {...}, privacyConsent: {...} }
[Legal] ✅ Firestore write completed for user: abc123
[Legal] Verifying write by reading back from Firestore...
[Legal] ✅ VERIFIED: Consent records successfully restored and verified in Firestore
[Legal] Restored data verified: {
  tosVersion: "1.0",
  privacyVersion: "1.0",
  needsTermsUpdate: false,
  acceptedAt: "2026-01-13T10:30:00.000Z"
}
```

### ToS Gate Modal Behavior
```
[ToSGate] Navigated away from exempt page, re-checking Firebase consent...
[ToSGate] Re-check result: {
  tosAccepted: true,
  privacyAccepted: true,
  stillNeedsAcceptance: false
}
[ToSGate] ✅ Consent was restored, marking as accepted
```

---

## Workflow for Affected Users

### To Restore Missing Consent (Existing Users)

1. You'll see a ToS modal blocking the app
2. Open browser DevTools (F12) to find your user ID in AuthContext
3. Navigate to `http://localhost:3000/admin/restore-consent`
4. The restoration page should load WITHOUT showing the ToS modal (it's exempt)
5. Click "Restore Consent Records" button
6. Wait for success message
7. Verify at `http://localhost:3000/admin/check-consent` that both acceptance checks are true
8. Navigate to main app - modal should NOT appear
9. Log out and log back in - modal should NOT appear on subsequent logins

### To Verify the Fix Worked

1. Go to `http://localhost:3000/admin/check-consent`
2. Verify acceptance checks show:
   - hasAcceptedCurrentToS: **true** ✓
   - hasAcceptedCurrentPrivacy: **true** ✓
   - Both Accepted: **YES** ✓
3. Verify raw Firestore data shows valid tosConsent and privacyConsent objects
4. Verify needsTermsUpdate is: **false**

---

## Files Modified

| File | Change | Reason |
|------|--------|--------|
| `lib/firebase/legal.ts` | Added `restoreMissingConsent()` function with verification | Restore missing consent records |
| `lib/firebase/legal.ts` | Updated `initializeUserLegalConsent()` to set needsTermsUpdate flag | Prevent modal for new users |
| `lib/firebase/legal.ts` | Updated `recordToSAcceptance/recordPrivacyAcceptance()` to set needsTermsUpdate: false | Ensure flag is always false after acceptance |
| `components/legal/ToSGateWrapper.tsx` | Added pathname detection and exempt pages list | Hide modal on admin pages |
| `components/legal/ToSGateWrapper.tsx` | Added dynamic re-checking logic on pathname change | Update consent status when navigating |
| `components/legal/ToSGateWrapper.tsx` | Added immediate state update on exempt pages | Prevent modal flash on restore/check pages |
| `lib/firebase/AuthContext.tsx` | Added try/catch around legal consent initialization | Don't fail signup if legal init fails |
| `app/admin/restore-consent/page.tsx` | Created new admin tool | Users can restore missing consent |
| `app/admin/check-consent/page.tsx` | Created new diagnostic tool | Users can verify consent data |

---

## Prevention for New Users

The system now prevents this issue for new users by:

1. **Proper Initialization**: `initializeUserLegalConsent()` always sets the `needsTermsUpdate` flag correctly
2. **Error Handling**: If legal consent initialization fails during signup, it doesn't block the signup (user can restore later)
3. **Acceptance Recording**: `recordToSAcceptance()` and `recordPrivacyAcceptance()` always set `needsTermsUpdate: false`
4. **Verification**: `restoreMissingConsent()` includes verification to ensure Firestore writes succeed

---

## Testing Checklist

See `docs/TEST_PLAN_ToS_FIX.md` for comprehensive testing procedures.

Quick verification:
- [ ] Navigate to `/admin/restore-consent` - modal does NOT appear
- [ ] Restore consent - success message appears
- [ ] Navigate to `/admin/check-consent` - both acceptance checks are true
- [ ] Navigate to main app - modal does NOT appear
- [ ] Log out and log back in - modal does NOT appear
- [ ] Create new account with ToS acceptance checked - modal does NOT appear on login

---

## Commits

| Commit | Message |
|--------|---------|
| fb8bfc8 | fix: Exempt admin consent tools from ToS gate modal |
| dd2b192 | fix: Re-check consent status when navigating away from exempt pages |
| a8987e4 | fix: Add verification and better diagnostics to consent restoration |
| f13c0db | fix: Improve re-check logic to hide modal on exempt pages immediately |

---

## Future Improvements

1. **Automated Migration**: Detect accounts with missing consent and prompt them to restore (instead of requiring manual navigation)
2. **Batch Restoration**: Server-side function to restore all affected users at once
3. **Consent History**: Track all consent changes with timestamps for compliance
4. **GDPR Integration**: Add data export/deletion endpoints
5. **Consent Versioning**: Handle when legal documents update (currently handled by `needsTermsUpdate` flag)

---

## Support

If users encounter issues after following the restoration workflow:

1. Check browser console (F12) for error messages
2. Verify Firestore data via Firebase Console
3. Check that all required fields are present:
   - `tosConsent` (with `version` field)
   - `privacyConsent` (with `version` field)
   - `needsTermsUpdate` (should be `false`)
4. Clear browser cache and try again
5. If issues persist, check the debugging guide in `docs/TEST_PLAN_ToS_FIX.md`
