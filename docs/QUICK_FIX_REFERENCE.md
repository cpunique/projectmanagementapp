# Quick Fix Reference - ToS/Privacy Consent Issues

## Problem: ToS Modal Won't Go Away

### Symptom
- ToS modal appears and blocks access to app
- Modal reappears after page refresh or logout/login
- Can't access main application

### Quick Diagnostic

**Step 1**: Open browser console (F12 → Console tab)

**Step 2**: Look for these log messages:

✓ **GOOD**: Consent data looks valid
```
[Legal] Retrieved consent for user [UID]: {
  hasToS: true,           // ← Should be true
  tosVersion: "1.0",      // ← Should have version
  hasPrivacy: true,       // ← Should be true
  privacyVersion: "1.0",  // ← Should have version
  needsUpdate: false      // ← Should be false
}
```

✗ **BAD**: Consent data is missing
```
[Legal] Retrieved consent for user [UID]: {
  hasToS: false,          // ← Problem: missing
  tosVersion: undefined,  // ← Problem: no version
  hasPrivacy: false,      // ← Problem: missing
  privacyVersion: undefined,  // ← Problem: no version
  needsUpdate: true       // ← Problem: should be false
}
```

### Quick Fix

1. **Go to restore page** (even though modal blocks main app):
   ```
   http://localhost:3000/admin/restore-consent
   ```

2. **You should see**: "Restore ToS/Privacy Consent" page WITHOUT the ToS modal

3. **Click**: "Restore Consent Records" button

4. **Wait for**: Green success message "Successfully restored..."

5. **Verify**: Go to `/admin/check-consent` and verify:
   - hasAcceptedCurrentToS: **true** ✓
   - hasAcceptedCurrentPrivacy: **true** ✓

6. **Navigate to main app** - modal should NOT appear

### If Modal Still Appears

**Check 1**: Did you navigate away from the restore page?
- The modal only hides on exempt pages (`/admin/restore-*` and `/admin/check-*`)
- After restoration, navigate to main app
- Check console for: `[ToSGate] Re-check result: { tosAccepted: true, privacyAccepted: true }`

**Check 2**: Did the restoration actually complete?
- Look for green success message
- Go to `/admin/check-consent` and verify consent data is there
- Check console for: `[Legal] ✅ VERIFIED: Consent records successfully restored`

**Check 3**: Clear browser cache and try again
- Press Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
- Select "Cookies and cached media"
- Check the appropriate time range and delete
- Refresh and try again

**Check 4**: Log out completely and log back in
- Logout (click profile → logout)
- Wait 2-3 seconds
- Log back in
- Modal should NOT appear (if it does, consent data not properly restored)

---

## Problem: New User Gets ToS Modal on First Login

### Expected Behavior
- During signup, user checks "I agree to Terms" and "I agree to Privacy Policy"
- After signup, user logs in
- ToS modal should NOT appear

### Symptom (Bug)
- User accepted ToS/Privacy during signup
- But modal appears on first login anyway
- User gets stuck on login

### Quick Check
Go to `/admin/check-consent` and verify:
- hasAcceptedCurrentToS: **true** ✓
- hasAcceptedCurrentPrivacy: **true** ✓
- needsTermsUpdate: **false**

If any of these are wrong, the signup consent initialization failed.

### Quick Fix
1. Go to `/admin/restore-consent`
2. Click restore
3. Should work immediately after

---

## Problem: Modal Doesn't Accept User's Response

### Symptom
- User clicks "Accept and Continue" button
- Modal appears to close briefly
- Modal reappears immediately

### Root Cause
Usually indicates acceptance recording to Firestore failed.

### Quick Fix
1. Open DevTools (F12)
2. Watch for errors in console
3. Check if acceptance is being recorded: look for `[recordToS]` or `[recordPrivacy]` logs
4. Try again
5. If persists, try the full restoration:
   - Go to `/admin/restore-consent`
   - Click restore
   - Verify at `/admin/check-consent`

---

## Key Console Log Prefixes to Watch For

| Prefix | Meaning |
|--------|---------|
| `[Legal]` | Legal consent system operations (read/write from Firestore) |
| `[ToSGate]` | ToS modal wrapper component behavior |
| `[recordToS]` | Recording ToS acceptance |
| `[recordPrivacy]` | Recording Privacy acceptance |
| `[Check]` | Consent check diagnostic page operations |

### What to Look For

**GOOD - Normal operations**:
```
[Legal] ✅ Firestore write completed
[Legal] ✅ VERIFIED: Consent records successfully restored
[ToSGate] ✅ Consent was restored, marking as accepted
```

**BAD - Errors**:
```
[Legal] ❌ VERIFICATION FAILED: Consent was not written to Firestore
[Legal] ❌ Failed to restore consent records
[recordToS] ❌ Failed to record ToS acceptance
```

---

## Admin Pages for Troubleshooting

### `/admin/restore-consent`
- **Purpose**: Restore missing consent records
- **When to use**: When console shows missing tosVersion/privacyVersion
- **Result**: Green success message when done

### `/admin/check-consent`
- **Purpose**: Verify consent data in Firestore
- **When to use**: To verify restoration worked or diagnose issues
- **Result**: Shows acceptance checks (should all be true) and raw Firestore data

---

## Firestore Data Structure (What to Check)

In Firebase Console → Firestore Database → users collection:

### Good User Document
```json
{
  "uid": "user123",
  "email": "user@example.com",
  "tosConsent": {
    "version": "1.0",
    "acceptedAt": "2026-01-13T10:30:00.000Z",
    "method": "checkbox"
  },
  "privacyConsent": {
    "version": "1.0",
    "acceptedAt": "2026-01-13T10:30:00.000Z",
    "method": "checkbox"
  },
  "needsTermsUpdate": false,
  "updatedAt": "2026-01-13T10:30:00.000Z"
}
```

### Bad User Document (Missing Consent)
```json
{
  "uid": "user123",
  "email": "user@example.com",
  "tosConsent": null,        // ← Missing
  "privacyConsent": null,    // ← Missing
  "needsTermsUpdate": true,  // ← Wrong (should be false)
  "updatedAt": "2026-01-12T08:00:00.000Z"
}
```

---

## Decision Tree for Troubleshooting

```
Does modal appear?
├─ YES → Check console logs
│  ├─ Missing tosVersion/privacyVersion in logs?
│  │  └─ YES → Go to /admin/restore-consent and restore
│  │
│  ├─ Both tosAccepted: true and privacyAccepted: true in logs?
│  │  ├─ YES → Clear browser cache and try again
│  │  └─ NO → Restoration didn't work, try again
│  │
│  └─ No logs at all?
│     └─ Check that browser console is set to show all levels (not just errors)
│
└─ NO → Working correctly! ✓
```

---

## Quick Checklist

- [ ] User can access `/admin/restore-consent` without modal appearing
- [ ] Restore button completes successfully with green message
- [ ] `/admin/check-consent` shows all acceptance checks as true
- [ ] User can navigate to main app without modal appearing
- [ ] User can logout and login again without modal appearing
- [ ] New users don't see modal on first login
- [ ] Console shows `✅` success messages, not `❌` errors

---

## Still Stuck?

If none of the above works:

1. **Clear everything and start fresh**:
   - Clear browser cache (Ctrl+Shift+Delete)
   - Close all tabs
   - Log out
   - Close browser completely
   - Reopen browser
   - Log back in

2. **Check Firestore in Firebase Console**:
   - Go to Firestore Database
   - Find your user document
   - Manually verify tosConsent and privacyConsent fields exist with correct versions
   - Verify needsTermsUpdate is false

3. **Check browser console for actual errors**:
   - Open DevTools (F12)
   - Go to Console tab
   - Look for red error messages (not just yellow warnings)
   - Copy any error messages for debugging

4. **Restart development server** (if running locally):
   - Stop: Ctrl+C in terminal
   - Wait 2 seconds
   - Restart: `npm run dev`
   - Clear cache again
   - Try once more

5. **Last resort**: Reset user account
   - Delete user from Firebase Authentication
   - Delete user document from Firestore
   - Create new account with proper consent initialization
