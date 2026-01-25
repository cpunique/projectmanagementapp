# Multi-Account Conflict Resolution - Implementation Guide

## Quick Summary

**Problem**: Same email can create 2 Firebase accounts (Google + Email/Password)
**Solution**: Show user selector when sharing with ambiguous email
**Impact**: Prevents sharing board with wrong account

---

## Implementation Checklist

### Phase 1: Backend - Store Auth Method (30 min)

**File**: `lib/firebase/AuthContext.tsx` or wherever users are created

**Change 1**: Store auth provider when user signs up
```typescript
// When creating new user profile after auth
const authProvider = user.providerData[0]?.providerId || 'password';

await setDoc(doc(db, 'users', user.uid), {
  uid: user.uid,
  email: user.email,
  authMethod: authProvider,  // 'google.com' or 'password'
  providers: user.providerData.map(p => p.providerId),
  displayName: user.displayName || user.email,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
```

**Firestore Schema Update**:
```
users/{uid}
├── uid: string
├── email: string
├── authMethod: string        // NEW: 'google.com' or 'password'
├── providers: string[]        // NEW: ['google.com', 'password']
├── displayName: string
├── createdAt: timestamp
└── updatedAt: timestamp
```

---

### Phase 2: Backend - Add Multiple User Lookup (30 min)

**File**: `lib/firebase/firestore.ts`

**Change**: Add new function to find all accounts with email
```typescript
/**
 * Get all user accounts with a specific email
 * (Multiple accounts can exist with same email from different providers)
 */
export async function getUsersByEmail(
  email: string
): Promise<Array<{ uid: string; email: string; authMethod: string }>> {
  try {
    const usersRef = getUsersCollection();
    const q = query(usersRef, where('email', '==', email));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return [];

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        uid: doc.id,
        email: data.email,
        authMethod: data.authMethod || 'unknown',
      };
    });
  } catch (error) {
    console.error('[UserLookup] Failed to lookup users by email:', error);
    return [];
  }
}
```

**Keep Old Function** for backward compatibility:
```typescript
export async function getUserByEmail(email: string) {
  const users = await getUsersByEmail(email);
  return users.length > 0 ? users[0] : null;
}
```

---

### Phase 3: Frontend - Update ShareBoardModal (1 hour)

**File**: `components/kanban/ShareBoardModal.tsx`

**Change 1**: Add state for multiple users
```typescript
import { getUsersByEmail, shareBoardWithUser } from '@/lib/firebase/firestore';

// Add to component state
const [userMatches, setUserMatches] = useState<Array<{
  uid: string;
  email: string;
  authMethod: string;
}>>([]);
const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
const [showUserSelector, setShowUserSelector] = useState(false);
```

**Change 2**: Update handleInvite to check for multiple matches
```typescript
const handleInvite = async () => {
  if (!email.trim()) {
    setError('Please enter an email');
    return;
  }

  setLoading(true);
  setError('');
  setSuccess('');
  setSelectedUserId(null);

  try {
    // Look up ALL users with this email
    const matches = await getUsersByEmail(email);

    if (matches.length === 0) {
      setError('User not found. Make sure they have signed up first.');
      setLoading(false);
      return;
    }

    if (matches.length === 1) {
      // Only one account - proceed with share
      const result = await shareBoardWithUser(
        board.id,
        email,
        role,
        currentUserId,
        matches[0].uid
      );

      if (result.success) {
        setEmail('');
        setSuccess(`Invited ${email} as ${role}`);

        if (onBoardUpdated) {
          const updatedBoard = await getBoard(board.id);
          if (updatedBoard) {
            setLocalBoard(updatedBoard);
            onBoardUpdated(updatedBoard);
          }
        }

        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to share');
      }
    } else {
      // Multiple accounts found - show selector
      setUserMatches(matches);
      setShowUserSelector(true);
    }
  } catch (err) {
    setError('Failed to lookup user');
    console.error('Error looking up user:', err);
  }

  setLoading(false);
};
```

**Change 3**: Add handler for user selection
```typescript
const handleInviteWithSelectedUser = async () => {
  if (!selectedUserId) {
    setError('Please select an account');
    return;
  }

  setLoading(true);
  setError('');

  try {
    const result = await shareBoardWithUser(
      board.id,
      email,
      role,
      currentUserId,
      selectedUserId
    );

    if (result.success) {
      setEmail('');
      setSuccess(`Invited ${email} as ${role}`);
      setShowUserSelector(false);
      setSelectedUserId(null);

      if (onBoardUpdated) {
        const updatedBoard = await getBoard(board.id);
        if (updatedBoard) {
          setLocalBoard(updatedBoard);
          onBoardUpdated(updatedBoard);
        }
      }

      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(result.error || 'Failed to share');
    }
  } catch (err) {
    setError('Failed to share board');
    console.error('Error sharing board:', err);
  }

  setLoading(false);
};
```

**Change 4**: Add UI for user selector (in return JSX, add after invite section)
```tsx
{/* User Selector - Show when multiple accounts found */}
{showUserSelector && userMatches.length > 1 && (
  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
    <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-3">
      Multiple accounts found for {email}
    </h4>
    <p className="text-sm text-blue-800 dark:text-blue-300 mb-3">
      Which account would you like to share this board with?
    </p>

    <div className="space-y-2 mb-4">
      {userMatches.map(match => (
        <button
          key={match.uid}
          onClick={() => setSelectedUserId(match.uid)}
          className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${
            selectedUserId === match.uid
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 dark:border-purple-400'
              : 'border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500'
          }`}
        >
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {match.email}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Signed up via:{' '}
            {match.authMethod === 'google.com'
              ? '🔵 Google'
              : match.authMethod === 'password'
              ? '✉️ Email/Password'
              : match.authMethod}
          </div>
        </button>
      ))}
    </div>

    <div className="flex gap-2">
      <button
        onClick={handleInviteWithSelectedUser}
        disabled={!selectedUserId || loading}
        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Share with Selected Account
      </button>
      <button
        onClick={() => {
          setShowUserSelector(false);
          setSelectedUserId(null);
          setUserMatches([]);
        }}
        className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
      >
        Cancel
      </button>
    </div>
  </div>
)}
```

---

### Phase 4: Backend - Update shareBoardWithUser (15 min)

**File**: `lib/firebase/firestore.ts`

**Change**: Add optional targetUserId parameter
```typescript
export async function shareBoardWithUser(
  boardId: string,
  userEmail: string,
  role: 'viewer' | 'editor',
  currentUserId: string,
  targetUserId?: string  // NEW: optional explicit user selection
): Promise<{ success: boolean; error?: string }> {
  try {
    const board = await getBoard(boardId);
    if (!board) {
      return { success: false, error: 'Board not found' };
    }

    // Check if user is owner
    if (board.ownerId !== currentUserId) {
      return { success: false, error: 'Only board owner can share' };
    }

    let userId = targetUserId;

    // If targetUserId not provided, look it up (backward compatible)
    if (!userId) {
      const targetUser = await getUserByEmail(userEmail);
      if (!targetUser) {
        return { success: false, error: 'User not found' };
      }
      userId = targetUser.uid;
    }

    // Check if already shared
    if (board.sharedWith?.some(c => c.userId === userId)) {
      return { success: false, error: 'User already has access to this board' };
    }

    // Create collaborator record
    const collaborator: BoardCollaborator = {
      userId,
      email: userEmail,
      role,
      addedAt: new Date().toISOString(),
      addedBy: currentUserId
    };

    // Update board
    const boardRef = doc(getBoardsCollection(), boardId);
    await updateDoc(boardRef, {
      sharedWith: arrayUnion(collaborator),
      updatedAt: serverTimestamp()
    });

    console.log('[Collaboration] Board shared with user:', userId);
    return { success: true };
  } catch (error) {
    console.error('[Collaboration] Failed to share board:', error);
    return { success: false, error: 'Failed to share board' };
  }
}
```

---

### Phase 5: Update Imports (5 min)

**File**: `components/kanban/ShareBoardModal.tsx`

**Change**: Add getUsersByEmail import
```typescript
import {
  shareBoardWithUser,
  removeCollaborator,
  updateCollaboratorRole,
  getBoard,
  getUsersByEmail  // NEW
} from '@/lib/firebase/firestore';
```

---

## Testing the Implementation

### Test 1: Single Account (No Change)
```
1. Create account: alice@example.com (Google)
2. Share board with: alice@example.com
3. Expected: No user selector shown, shares immediately ✓
```

### Test 2: Multiple Accounts (Your Scenario)
```
1. Create account: rcaton1105@gmail.com (Google) [uid: google_123]
2. Create account: rcaton1105@gmail.com (Email) [uid: email_456]
3. Try to share board with: rcaton1105@gmail.com
4. Expected: User selector shown with both accounts ✓
5. Select: "Gmail via Google"
6. Expected: Board shared with google_123 (correct account) ✓
```

### Test 3: User Not Found
```
1. Try to share with: nonexistent@example.com
2. Expected: Error message "User not found. Make sure they have signed up first." ✓
```

### Test 4: Existing Collaborator
```
1. Already shared board with bob@example.com
2. Try to share again
3. Expected: Error message "User already has access to this board" ✓
```

---

## Debug: Check Your Users Collection

Run this in Firebase Console to see what's stored:

```javascript
db.collection('users').get().then(snapshot => {
  snapshot.forEach(doc => {
    console.log(doc.id, '→', doc.data());
  });
});
```

Look for entries with:
- Same `email` field
- Different `uid` (doc ID)
- Different `authMethod` (one 'google.com', one 'password')

---

## Rollout Plan

### Step 1: Deploy (This Sprint)
- [ ] Add authMethod to user profile on signup
- [ ] Add getUsersByEmail function
- [ ] Update ShareBoardModal with user selector
- [ ] Test with your dual accounts

### Step 2: Monitor (After Deployment)
- [ ] Watch for user confusion about multiple accounts
- [ ] Gather feedback on user selector UI
- [ ] Track how often multiple accounts appear

### Step 3: Future - Account Linking
- [ ] If users complain about multiple accounts, implement option 1
- [ ] Use Firebase's linkWithRedirect API
- [ ] Merge multiple auth providers into one

---

## Backwards Compatibility

**Important**: Old code calling `shareBoardWithUser(boardId, email, role, userId)` still works:
- If `targetUserId` omitted, falls back to email lookup
- Existing calls don't break
- New code can pass explicit UID

---

## Timeline
- **Step 1 (Phase 1-2)**: 1 hour - Backend changes
- **Step 2 (Phase 3)**: 1 hour - UI changes
- **Step 3 (Phase 4-5)**: 30 min - Integration
- **Testing**: 30 min - Verify scenarios above

**Total: ~3 hours to full implementation**

---

## Success Criteria

- [x] Users can identify multiple accounts when sharing
- [x] Can explicitly select which account to share with
- [x] No ambiguity - board goes to intended recipient
- [x] Error messages clear when user not found
- [x] Existing functionality unchanged

---

## Questions Before Implementation?

1. Should we show account creation date to help users distinguish?
2. Should we auto-link if user signs in with both providers?
3. Should we warn users about multiple accounts on profile page?
