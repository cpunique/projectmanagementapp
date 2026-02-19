# Roadmap Summary — February 18, 2026

## Recently Completed (This Sprint)

### Phase 1: Search + Activity Feed Badge
- **Search & Filter** — debounced search across card titles/descriptions, priority filter dropdown, overdue-only toggle
- **Activity Feed Badge** — unread count on clock icon, per-board last-seen tracking via IndexedDB, resets on panel open

### Phase 2: Board Templates + JSON Export
- **6 Board Templates** — Blank, Software Development (with Descoped column), Marketing, Event Planning, Personal, Bug Tracking
- **JSON Export** — download any board as a JSON file from the board dropdown

### Phase 3: Card Attachments (Dormant)
- **Full implementation** — upload/download/delete, drag-and-drop, image thumbnails, 10MB limit, paperclip badge on cards
- **Requires Firebase Blaze plan** — Storage rules written but not deployed; feature activates when Storage is enabled

### Phase 4: Enhanced Conflict Resolution
- **3-way merge** — base/local/remote board comparison with field-level diffs
- **Per-field resolution UI** — side-by-side diff with mine/theirs radio buttons
- **Bulk actions** — "Keep all mine" / "Use all remote"
- **Auto-resolve** — non-conflicting changes merged automatically
- **Backward compatible** — falls back to simple dialog when no base version available

### Phase 5: Analytics Panel + Health Dashboard
- **Analytics Panel** — card counts by column, priority distribution, top tags, checklist progress, CSS bar charts
- **Health Dashboard** — modal showing sync state, network status, pending operations, board sizes, browser storage usage

### Bug Fixes & Enhancements
- **Card Activity Timeline** — per-card activity history inside CardModal (created, moved, updated, comments)
- **Expanded activity logging** — now tracks all card field changes (description, notes, tags, color, checklist)
- **UI preferences persistence** — dedicated localStorage keys for darkMode/zoomLevel, survives Zustand persist cycles
- **Search filter fix** — blur handler checks relatedTarget to prevent collapse when clicking filter button
- **Activity badge fix** — race condition resolved (load lastSeen before subscribing), count resets after viewing

## Previously Completed
- **Per-User Preference Persistence** (dark mode + zoom isolated per account)
- **Performance Optimization** (first load JS 450 kB → 325 kB, -28%)
- **Pro Auth Fix** — JWT properly decoded for UID extraction
- **Default Board Fix** — Custom Zustand persist merge prevents rehydration wipe
- **Error Boundary** — Runtime errors display instead of blank page
- **Basic Conflict Detection** (multi-device safety, now upgraded to 3-way merge)
- **Disaster Recovery MVP** (IndexedDB + Sync Queue + Enhanced Status)
- **Page Zoom Control** (50-150% range, persisted)
- **Dark Mode Preference Sync** (persisted via dedicated localStorage + Firestore)
- **Production Hardening** (console stripped, hydration fixed, COOP header, skipHydration)
- **Collaboration Features** (comments, @mentions, notifications, presence, board sharing)
- **Pro feature gating** + AI-generated instructions
- **Role-based permissions** (Firestore rules + frontend)
- **Keyboard shortcuts & confetti celebration**

## Next on Roadmap (By Priority)

### Ready When Needed
- **Enable Attachments** — upgrade to Firebase Blaze, deploy storage rules, feature is already built
- **Automated Backups** — scheduled Firestore exports or Cloud Function snapshots

### Potential Future Features
- **Recurring Tasks** — auto-create cards on schedule
- **Card Dependencies** — blocked-by / blocks relationships
- **Board Import** — import from JSON (complement to existing export)
- **Email Notifications** — digest of activity (requires Cloud Function)
- **Burndown Charts** — time-series velocity tracking in analytics panel

## Production Readiness: ~95%
All core features deployed and tested. Search, templates, analytics, conflict resolution, activity tracking, collaboration, offline sync, and disaster recovery all in place. Attachments ready but gated behind Firebase Blaze. Only missing automated backups and advanced reporting for full feature parity with commercial tools.
