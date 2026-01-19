# Default Board Persistence - Root Cause Analysis & Fix

## Problem
When you manually set a board as default (by clicking the star), it would immediately be overwritten if you switched to a different board. Logging out and back in would show the last board you viewed, not the one you starred.

## Root Cause
The `useDefaultBoardSaver` hook in `lib/hooks/useDefaultBoardSaver.ts` was **automatically saving the active board as the default** whenever you switched boards.

**The broken flow:**
```
1. Click star on "Kanban-app Features"
   → setUserDefaultBoard(userId, "kanban-app-features-id") ✅
   → Saved to Firestore

2. User switches to "Project Alpha" board
   → activeBoard changes
   → useDefaultBoardSaver hook fires
   → setUserDefaultBoard(userId, "project-alpha-id") ❌ OVERWRITES!

3. User logs out and back in
   → Firestore loads defaultBoardId = "project-alpha-id"
   → "Project Alpha" loads (wrong board!)
```

## Why This Happened
The hook was designed to auto-remember the last board you were working on. However, it didn't account for the new feature where users can **manually** set a default via the star icon. The hook would blindly overwrite any manual selection when you switched boards.

## Solution
Modified `useDefaultBoardSaver` to check if there's an **explicit default** set (defaultBoardId !== null). If there is, the hook skips auto-saving and respects the user's manual choice.

**Key changes in `lib/hooks/useDefaultBoardSaver.ts`:**
```typescript
const defaultBoardId = useKanbanStore((state) => state.defaultBoardId);

useEffect(() => {
  if (!user || !activeBoard) return;

  // CRITICAL: Only auto-save if there's NO explicit default set
  if (defaultBoardId !== null) {
    console.log('[DefaultBoardSaver] Skipping auto-save - user has explicitly set default:', defaultBoardId);
    return;
  }

  // Continue with auto-save only if defaultBoardId is null
  // ...
}, [user?.uid, activeBoard, defaultBoardId]); // Added defaultBoardId to deps
```

## Correct Flow After Fix
```
1. Click star on "Kanban-app Features"
   → setUserDefaultBoard(userId, "kanban-app-features-id") ✅

2. User switches to "Project Alpha" board
   → activeBoard changes
   → useDefaultBoardSaver hook checks: defaultBoardId !== null? YES
   → Hook returns early, skips auto-save ✅
   → Firestore NOT updated

3. User logs out and back in
   → Firestore loads defaultBoardId = "kanban-app-features-id"
   → "Kanban-app Features" loads with star highlighted ✅
```

## Behavior After Fix

### Scenario A: User manually sets default
1. Click star on board X → defaultBoardId = X in Firestore
2. Switch to board Y → useDefaultBoardSaver skips (defaultBoardId !== null)
3. Log out/in → board X loads

### Scenario B: User doesn't manually set default
1. No star clicked → defaultBoardId = null
2. Switch to board Y → useDefaultBoardSaver auto-saves Y (defaultBoardId === null)
3. Log out/in → board Y loads (remember last board)

## Testing

**Test Manual Selection:**
```
1. Open DevTools Console (F12)
2. Click star on "Kanban-app Features"
   → Look for: [BoardSwitcher] Star clicked: {boardId: 'cWJG-tcwTDxM8zg2kGvji', ...}
3. Switch to a different board
   → Look for: [DefaultBoardSaver] Skipping auto-save - user has explicitly set default: cWJG-tcwTDxM8zg2kGvji
   → Should NOT see: [DefaultBoardSaver] Auto-saved active board as default
4. Log out
5. Log back in
   → Should load "Kanban-app Features" with star highlighted ✅
```

**Test Auto-Remember (no manual default):**
```
1. Unset any manual default
2. Switch to "Project Alpha"
   → Look for: [DefaultBoardSaver] Auto-saved active board as default (no explicit default set): project-alpha-id
3. Log out
4. Log back in
   → Should load "Project Alpha" (auto-remembered) ✅
```

## Files Modified
- `lib/hooks/useDefaultBoardSaver.ts` - Added explicit default check
- `components/kanban/BoardSwitcher.tsx` - Debug logging (can be removed later)
- `lib/store.ts` - Debug logging (can be removed later)
- `lib/firebase/firestore.ts` - Debug logging (can be removed later)
- `lib/firebase/storeSync.ts` - Debug logging (can be removed later)

## Commits
- **23c0969**: Fix prevent auto-save hook from overwriting manually-selected default board (MAIN FIX)
- **f5436b9**: Debug logging (can remove once verified working)
- **f04c16f**: Store migration cleanup (supporting fix)

## Related Issues
This bug only appeared because we added the manual star-selection feature for default boards. The hook wasn't expecting this use case.

## Prevention
In future, when adding new features that interact with global state (like defaultBoardId), review all hooks that modify that state to ensure they don't conflict.
