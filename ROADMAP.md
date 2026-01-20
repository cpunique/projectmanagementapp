# Kanban App - Development Roadmap

## Recently Completed ✅

### Default Board Persistence Fix (Jan 2026)
- ✅ Fixed star-selected default board not persisting across logout/login
- ✅ Fixed `useDefaultBoardSaver` hook conflict with manual selection
- ✅ Fixed localStorage migration issues
- ✅ Fixed ToS modal flash on hard refresh (increased delay to 500ms)

**Status**: Deployed to production
**Documentation**: See `docs/FIXES_SUMMARY.md` for details

---

## Current Status

Your Kanban app is **functionally complete** for basic usage with:
- ✅ Multi-board management
- ✅ Drag-and-drop cards
- ✅ Firebase authentication & sync
- ✅ ToS/Privacy consent tracking
- ✅ Auto-save functionality
- ✅ Default board selection

**Production Readiness**: ⚠️ **60%**
- Core features work well
- Data sync is functional
- Missing critical disaster recovery features

---

## Next Major Milestone: Disaster Recovery & Data Resilience

**Goal**: Make the app production-ready with bulletproof data handling

**Current Gaps**:
1. ❌ No offline sync queue (changes lost if browser closes while offline)
2. ❌ localStorage capacity limits (5-10MB max, fails on large boards)
3. ❌ No conflict detection (multi-device edits can cause data loss)
4. ❌ No data integrity verification (corruption goes undetected)
5. ❌ No automated backups (users must remember to export)

**Recommended Approach**: **2-Week MVP** focusing on critical features

### Week 1: Sync Queue & Status ⭐ HIGHEST PRIORITY

#### Task 1.1: Implement Sync Queue with Retry Logic
**Priority**: CRITICAL
**Effort**: High (3 days)
**Impact**: Prevents offline data loss

**What it does**:
- Queues all save operations in IndexedDB
- Retries failed operations with exponential backoff
- Guarantees no data loss even if browser closes offline

**Files to create**:
- `lib/sync/SyncQueue.ts` - Queue management
- `lib/sync/SyncOperation.ts` - Operation types
- `lib/sync/NetworkMonitor.ts` - Network tracking

**Files to modify**:
- `lib/firebase/storeSync.ts` - Use queue instead of direct saves
- `lib/hooks/useAutoSave.ts` - Enqueue operations

**Testing**:
```
1. Go offline
2. Make changes to cards
3. Close browser
4. Reopen and go online
Expected: All changes sync successfully ✅
```

---

#### Task 1.2: Visual Sync Status Indicator
**Priority**: HIGH
**Effort**: Low (1 day)
**Impact**: User awareness of sync state

**What it does**:
- Shows real-time sync status in header
- Displays queue size when offline
- Provides retry button on errors

**Visual states**:
- ✓ Synced (green)
- ↻ Syncing... 3/10 (blue with progress)
- ⚠ Offline - 5 pending (yellow)
- ✗ Sync failed (red with retry)

**Files to modify**:
- `components/layout/Header.tsx` - Add badge
- `components/ui/SyncStatus.tsx` - Enhance component

---

#### Task 1.3: Migrate to IndexedDB
**Priority**: HIGH
**Effort**: Medium (2 days)
**Impact**: Prevents quota errors, enables sync queue

**What it does**:
- Replaces localStorage with IndexedDB
- Increases storage capacity from 5MB to 50MB+
- Enables persistent sync queue storage

**Files to create**:
- `lib/db/BoardDatabase.ts` - Dexie schema
- `lib/db/migrations.ts` - Migration logic
- `lib/db/adapter.ts` - Zustand storage adapter

**Files to modify**:
- `lib/store.ts` - Use IndexedDB adapter

**Migration flow**:
1. Check if localStorage has data
2. Copy to IndexedDB
3. Verify migration succeeded
4. Clear localStorage

**NPM packages needed**:
```json
{
  "dexie": "^4.0.0"
}
```

---

### Week 2: Conflict Detection Foundation

#### Task 2.1: Basic Conflict Detection
**Priority**: MEDIUM
**Effort**: Medium (3 days)
**Impact**: Multi-device safety

**What it does**:
- Adds version tracking to boards
- Detects when local/remote versions diverge
- Logs conflicts for review (doesn't auto-resolve yet)

**Files to create**:
- `lib/sync/ConflictDetector.ts`

**Files to modify**:
- `lib/firebase/firestore.ts` - Add version field
- `lib/firebase/storeSync.ts` - Check before sync

**Full auto-merge resolution deferred to Week 3-4**

---

## Future Enhancements (Post-MVP)

### Phase 2: Full Conflict Resolution (Weeks 3-4)
- Auto-merge strategies for non-conflicting changes
- Side-by-side conflict resolution UI
- Manual merge tools

### Phase 3: Data Integrity (Week 5)
- SHA-256 checksums for corruption detection
- Referential integrity checks
- Auto-repair for simple errors

### Phase 4: Automated Backups (Week 6)
- Daily auto-backups to IndexedDB
- Keep last 7 backups
- Backup browser UI
- One-click restore

### Phase 5: Health Dashboard (Week 7)
- Sync health metrics
- Storage usage monitoring
- Conflict history
- Backup status

---

## Alternative Focus Areas

If disaster recovery isn't urgent, consider these instead:

### A. Performance Optimization
- Profile and optimize render performance
- Implement virtual scrolling for large boards
- Lazy load card details
- Optimize Firebase queries

**Estimated effort**: 1 week

### B. Collaboration Features
- Real-time multi-user editing
- User presence indicators
- Comment threads on cards
- @mentions and notifications

**Estimated effort**: 3-4 weeks

### C. Advanced Card Features
- Card templates
- Recurring tasks
- Dependencies between cards
- Time tracking
- File attachments

**Estimated effort**: 2-3 weeks

### D. Reporting & Analytics
- Burndown charts
- Velocity tracking
- Time in column analytics
- Export to CSV/PDF

**Estimated effort**: 2 weeks

---

## Recommended Next Steps

**Option 1: Disaster Recovery MVP (Recommended)**
- **Timeline**: 2 weeks
- **Deliverables**: Sync queue, IndexedDB, basic conflict detection
- **Risk**: Medium complexity
- **Value**: High (prevents data loss)

**Option 2: Quick Wins**
- **Timeline**: 3-5 days
- **Focus**: Performance optimization + UX polish
- **Risk**: Low
- **Value**: Medium (better experience)

**Option 3: Feature Development**
- **Timeline**: 2-4 weeks (varies by feature)
- **Focus**: Collaboration or advanced cards
- **Risk**: Medium-High
- **Value**: High (competitive features)

---

## Decision Points

Before starting, clarify:

1. **Multi-device usage**: Do you/your users work across multiple devices?
   - YES → Disaster recovery is critical (start Week 1)
   - NO → Can defer conflict detection, focus on other features

2. **Data volume**: Do you have boards with 100+ cards?
   - YES → IndexedDB migration is urgent
   - NO → Can defer, localStorage sufficient

3. **Business priority**: What matters most right now?
   - **Reliability** → Disaster recovery
   - **Features** → Collaboration or advanced cards
   - **Performance** → Optimization work

---

## Timeline Estimates

| Milestone | Duration | Complexity | Value |
|-----------|----------|------------|-------|
| Disaster Recovery MVP | 2 weeks | High | Critical |
| Full Conflict Resolution | 2 weeks | High | High |
| Data Integrity | 1 week | Medium | Medium |
| Automated Backups | 1 week | Low | Medium |
| Health Dashboard | 1 week | Low | Low |
| Performance Optimization | 1 week | Medium | High |
| Collaboration Features | 3-4 weeks | High | High |
| Advanced Card Features | 2-3 weeks | Medium | High |
| Reporting & Analytics | 2 weeks | Medium | Medium |

---

## Quick Reference: What's Next?

**If you want bulletproof data handling** → Start with Disaster Recovery Week 1

**If you want more features** → Choose from Alternative Focus Areas

**If unsure** → Answer the Decision Points questions above

---

## Related Documentation

- **Detailed Disaster Recovery Plan**: `C:\Users\rcato\.claude\plans\cosmic-cooking-moonbeam.md`
- **Recent Fixes**: `docs/FIXES_SUMMARY.md`
- **Testing Guides**: `docs/DEFAULT_BOARD_FIX_TEST.md`
- **Root Cause Analysis**: `docs/DEFAULT_BOARD_ROOT_CAUSE.md`

---

**Last Updated**: January 18, 2026
**Current Version**: Production-ready for basic usage
**Recommended Next**: Disaster Recovery MVP (2 weeks)
