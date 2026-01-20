# Multi-Provider Authentication Strategy

## Problem Statement

Firebase Authentication allows a single email address to be used with multiple authentication providers (Google, Email/Password, GitHub, etc.). This creates an identity conflict in board collaboration:

**Scenario**:
- User signs up with Google: `rcaton1105@gmail.com` (creates `auth.uid` = `"google_abc123"`)
- Same user later signs up with Email/Password: `rcaton1105@gmail.com` (creates `auth.uid` = `"password_xyz789"`)
- Firebase treats these as **two completely different user accounts**
- When collaborating, the app can't tell which account to share the board with

**Current Behavior**:
```
User A wants to share board with rcaton1105@gmail.com
→ App queries users collection by email
→ Finds first match (could be either Google OR Password account)
→ Shares with wrong account
→ Intended recipient doesn't have access
```

---

## Root Cause

The app uses `email` field for user lookups during collaboration:

```typescript
// firestore.ts
export async function getUserByEmail(email: string) {
  const q = query(usersRef, where('email', '==', email), limit(1));
  // Returns first user with matching email (non-deterministic)
}
```

This is problematic because:
1. **Multiple accounts same email**: Returns first match, not the user you intended
2. **No provider awareness**: Doesn't know which provider the original user used
3. **User confusion**: User can't distinguish which account is which

---

## Solution Options

### Option 1: Link Auth Providers (Recommended for Production)
**Priority**: HIGH | **Complexity**: MEDIUM | **User Impact**: Best

Firebase provides "account linking" to merge multiple auth providers into one account.

**How It Works**:
```
User creates account via Google (uid: "google_abc123")
Later tries to sign up with email (same address)
Firebase detects existing auth user with that email
Options:
  a) Prompt: "This email already exists. Link to your Google account?"
  b) Auto-link: If terms allow, automatically link accounts
  c) Prevent: Block duplicate email, force sign-in instead
```

**Implementation**:
```typescript
// On signup attempt with email that already exists:
const existingAuth = await getAuth().fetchSignInMethodsForEmail(email);
// existingAuth = ['google.com', 'password'] if already linked
// existingAuth = ['google.com'] if only Google exists

if (existingAuth.length > 0 && !existingAuth.includes('password')) {
  // Prompt user: "This email is linked to Google. Sign in with Google?"
  // Or: "Link your password to your existing Google account?"
}
```

**Pros**:
- ✅ All data stays in one account
- ✅ Best UX - users see one profile
- ✅ No collaboration conflicts
- ✅ Firebase native feature

**Cons**:
- ⚠️ Requires signup flow changes
- ⚠️ Users might not understand linking

---

### Option 2: Multi-Account Strategy (Current Workaround)
**Priority**: MEDIUM | **Complexity**: LOW | **User Impact**: Good

Allow multiple accounts per email but add **provider info** and **account selection UI**.

**How It Works**:
```
User selects multiple accounts in settings:
  ☐ rcaton1105@gmail.com (via Google)
  ☐ rcaton1105@gmail.com (via Email/Password)

When sharing, collaborator sees:
  "Invite rcaton1105@gmail.com"
  ├─ Google Account (rcaton1105@gmail.com)
  └─ Email Account (rcaton1105@gmail.com)

  [Select account to share with]
```

**Implementation**:
```typescript
// 1. Store provider info in users collection
interface UserProfile {
  uid: string;
  email: string;
  providers: string[];  // ['google.com', 'password']
  authMethod: string;   // 'google.com' or 'password'
  createdAt: Date;
}

// 2. Find ALL accounts with matching email
export async function getUsersByEmail(email: string): Promise<UserProfile[]> {
  const q = query(usersRef, where('email', '==', email));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    uid: doc.id,
    ...doc.data()
  }));
}

// 3. When sharing, show user options
const matches = await getUsersByEmail("rcaton1105@gmail.com");
if (matches.length > 1) {
  // Show user selection UI
  // "Multiple accounts with this email. Which one to share with?"
} else {
  // Share with the one account
}
```

**Pros**:
- ✅ Prevents sharing with wrong account
- ✅ No signup flow changes
- ✅ Can implement quickly
- ✅ Gives user explicit control

**Cons**:
- ⚠️ More UX complexity
- ⚠️ Users might be confused by multiple accounts
- ⚠️ Requires additional disambiguation UI

---

### Option 3: Prevent Duplicate Emails (Strict Approach)
**Priority**: LOW | **Complexity**: MEDIUM | **User Impact**: Restrictive

Block signup if email already exists in any form.

**How It Works**:
```
User tries password signup with rcaton1105@gmail.com
App checks: Does this email exist in auth system?
If YES: "This email is already in use. Sign in instead."
Force existing provider sign-in
```

**Implementation**:
```typescript
// On email signup attempt
const existingMethods = await auth.fetchSignInMethodsForEmail(email);
if (existingMethods.length > 0) {
  throw new Error(
    `This email is linked to: ${existingMethods.join(', ')}.
     Sign in with that method instead.`
  );
}
```

**Pros**:
- ✅ Prevents confusion entirely
- ✅ One account per email
- ✅ No collaboration conflicts
- ✅ Simplest to implement

**Cons**:
- ❌ Restrictive UX - can't create password account if Google exists
- ❌ Users might not remember which provider they used
- ❌ Might frustrate users who want both methods

---

## Recommended Implementation Path

### MVP (Week 3-4): Option 2 - Multi-Account Strategy

**Why**:
- No changes to existing auth flow
- Prevents wrong-account sharing immediately
- Minimal UX disruption
- Can add account linking later

**Implementation Steps**:

#### Step 1: Enhance User Profile Storage
```typescript
// In AuthContext.tsx or user creation handler
const userProfile = {
  uid: user.uid,
  email: user.email,
  authMethod: user.providerData[0]?.providerId || 'password',
  providers: user.providerData.map(p => p.providerId),
  displayName: user.displayName || user.email,
  createdAt: new Date().toISOString(),
};
```

#### Step 2: Update getUserByEmail to Return Multiple Results
```typescript
// firestore.ts - NEW function
export async function getUsersByEmail(
  email: string
): Promise<Array<{ uid: string; email: string; authMethod: string }>> {
  try {
    const usersRef = getUsersCollection();
    const q = query(usersRef, where('email', '==', email));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      uid: doc.id,
      email: doc.data().email,
      authMethod: doc.data().authMethod || 'unknown',
    }));
  } catch (error) {
    console.error('[UserLookup] Failed to lookup users by email:', error);
    return [];
  }
}

// DEPRECATE old function or update it:
export async function getUserByEmail(email: string) {
  const users = await getUsersByEmail(email);
  return users.length > 0 ? users[0] : null;
}
```

#### Step 3: Update ShareBoardModal to Handle Multiple Matches
```typescript
// components/kanban/ShareBoardModal.tsx

const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
const [userMatches, setUserMatches] = useState<Array<{
  uid: string;
  email: string;
  authMethod: string
}>>([]);
const [showUserSelector, setShowUserSelector] = useState(false);

const handleInvite = async () => {
  if (!email.trim()) {
    setError('Please enter an email');
    return;
  }

  setLoading(true);
  setError('');

  try {
    // Look up all users with this email
    const matches = await getUsersByEmail(email);

    if (matches.length === 0) {
      setError('User not found. Have they signed up yet?');
    } else if (matches.length === 1) {
      // Unambiguous - share with the only match
      const result = await shareBoardWithUser(
        board.id,
        email,
        role,
        currentUserId,
        matches[0].uid
      );
      handleShareResult(result);
    } else {
      // Multiple matches - show selector
      setUserMatches(matches);
      setShowUserSelector(true);
    }
  } catch (err) {
    setError('Failed to lookup user');
  }

  setLoading(false);
};

// JSX: Show user selector modal if multiple matches
{showUserSelector && (
  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
    <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-3">
      Multiple accounts found for {email}. Which one to share with?
    </p>
    <div className="space-y-2">
      {userMatches.map(match => (
        <button
          key={match.uid}
          onClick={() => {
            setSelectedUserId(match.uid);
            setShowUserSelector(false);
          }}
          className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${
            selectedUserId === match.uid
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
          }`}
        >
          <div className="font-medium">{match.email}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Signed up via: {match.authMethod === 'google.com' ? 'Google' : 'Email'}
          </div>
        </button>
      ))}
    </div>
    <div className="flex gap-2 mt-4">
      <button
        onClick={() => {
          // Proceed with share using selectedUserId
          handleShareWithSelected();
        }}
        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
      >
        Share with Selected Account
      </button>
      <button
        onClick={() => setShowUserSelector(false)}
        className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300"
      >
        Cancel
      </button>
    </div>
  </div>
)}
```

#### Step 4: Update shareBoardWithUser to Accept Specific UID
```typescript
// firestore.ts
export async function shareBoardWithUser(
  boardId: string,
  userEmail: string,
  role: 'viewer' | 'editor',
  currentUserId: string,
  targetUserId?: string  // NEW: explicit user selection
): Promise<{ success: boolean; error?: string }> {
  try {
    // If targetUserId provided, use it directly
    // Otherwise look up the user
    let userId = targetUserId;

    if (!userId) {
      const targetUser = await getUserByEmail(userEmail);
      if (!targetUser) {
        return { success: false, error: 'User not found' };
      }
      userId = targetUser.uid;
    }

    // Rest of function stays the same...
    const board = await getBoard(boardId);
    if (!board) {
      return { success: false, error: 'Board not found' };
    }

    if (board.sharedWith?.some(c => c.userId === userId)) {
      return { success: false, error: 'User already has access' };
    }

    const collaborator: BoardCollaborator = {
      userId,
      email: userEmail,
      role,
      addedAt: new Date().toISOString(),
      addedBy: currentUserId
    };

    const boardRef = doc(getBoardsCollection(), boardId);
    await updateDoc(boardRef, {
      sharedWith: arrayUnion(collaborator),
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('[Collaboration] Failed to share board:', error);
    return { success: false, error: 'Failed to share board' };
  }
}
```

---

## Future Implementation: Account Linking (Week 5+)

Once multi-account strategy is working, implement Firebase's account linking:

```typescript
// AuthContext.tsx or new file: accountLinking.ts

import {
  linkWithRedirect,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  fetchSignInMethodsForEmail
} from 'firebase/auth';

export async function handleProviderConflict(
  auth: Auth,
  email: string,
  attemptedProvider: string
) {
  // Check what providers already use this email
  const methods = await fetchSignInMethodsForEmail(auth, email);

  if (methods.length > 0 && !methods.includes(attemptedProvider)) {
    // Email already exists with different provider

    // Option A: Show linking flow
    return {
      conflict: true,
      message: `This email is already linked to ${methods.join(', ')}`,
      existingProviders: methods,
      suggestedAction: 'link_account' // User can link providers
    };
  }
}

export async function linkProviders(
  auth: Auth,
  password: string,
  googleProvider: GoogleAuthProvider
) {
  // User is signed in with Google
  // Now link password auth to the same account
  try {
    const credential = EmailAuthProvider.credential(auth.currentUser!.email!, password);
    await linkCredentialToCurrentUser(auth, credential);
    return { success: true, message: 'Password linked to your Google account' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

---

## Testing Your Multi-Account Scenario

### Test Case: Duplicate Email Signup

**Setup**:
1. Create account with Google: `rcaton1105@gmail.com`
2. Try to create account with Email/Password: `rcaton1105@gmail.com`

**Current Behavior**:
- Firebase allows both (two separate auth accounts)
- App stores both in users collection
- When collaborating, ambiguous which account gets board

**After Option 2 Implementation**:
- User lookup finds both accounts
- ShareBoardModal shows: "Multiple accounts found"
- User selects which account to share with
- No confusion, clear intent

**After Option 1 Implementation (Later)**:
- Firebase/app prompts: "Email already exists with Google. Link them?"
- User links accounts
- Only one account exists with that email

---

## Recommendation: Implement Option 2 Now

**Why**:
1. **Immediate fix**: Prevents wrong-account sharing today
2. **No breaking changes**: Existing auth flow unchanged
3. **Easy test**: You can test with your own dual accounts
4. **Clear migration path**: Option 1 can replace it later

**Effort**: 2-3 hours
- ✅ 30 min: Store auth method in user profile
- ✅ 30 min: Update getUserByEmail to getUsersByEmail
- ✅ 1 hour: Add user selector UI to ShareBoardModal
- ✅ 30 min: Test with multiple email signup scenarios

**Next Step**: Should I implement Option 2 now, or would you prefer to test the current behavior first?

---

## Configuration for Your Test

To test safely without confusing other users:

```typescript
// Add to ShareBoardModal - DEBUG mode
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// Always show user selector in debug (even for single match)
const shouldShowSelector = DEBUG_MODE || userMatches.length > 1;
```

This way:
- In dev: Always see user selector for testing
- In prod: Only show when actually ambiguous

---

## Security Notes

**Considerations**:
1. When sharing by email, app should notify both account emails
2. Store which provider was used in `authMethod` field
3. Consider rate limiting email lookups (prevent user enumeration)
4. Audit log: track who shared boards with whom

---

## Decision Matrix

| Approach | Speed | UX | Reliability | Scalability |
|----------|-------|----|----|------|
| Option 1 (Link) | Medium | Excellent | Perfect | Excellent |
| Option 2 (Multi) | Fast | Good | Excellent | Good |
| Option 3 (Strict) | Medium | Poor | Perfect | Excellent |

**Recommendation**: Start with Option 2, migrate to Option 1 when ready.
