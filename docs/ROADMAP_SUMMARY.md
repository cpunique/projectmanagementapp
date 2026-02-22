# Roadmap Summary — February 22, 2026

## Current Sprint (Completed & Deployed)

### Copy Card to Board
- Right-click context menu → "Copy to board…" submenu
- Only shows boards where user is owner or editor
- Logs `card_copied` activity with target board name

### Card Dependencies (blocked-by / blocks)
- `blockedBy?: string[]` field on Card — Firebase synced automatically
- Dependencies section in CardModal: chip list, ✕ remove, searchable live picker
- Derived "Blocks (N)" read-only section for reverse direction
- Red "Blocked — waiting on N card(s)" banner when any blocker not yet done
- Chain-link badge on card face: red = actively blocked, gray = all done
- Hover tooltip on badge: up to 3 blocker titles with ✓/● status

### Weekly Velocity Chart
- New section in Analytics Panel (below Activity Heatmap)
- Pulls `card_moved` activities from Firestore, filters for moves to done column
- 8-week Sunday-anchored buckets, deduplicates by cardId per week
- Green bar chart with hover tooltips; total "X in 8 wks" in header
- Done column detected by keywords (completed/done/finished/closed/delivered)

---

## Previously Completed

### Phase 1: Search + Activity Feed Badge
- **Search & Filter** — debounced search across card titles/descriptions, priority filter dropdown, overdue-only toggle
- **Activity Feed Badge** — unread count on clock icon, per-board last-seen tracking via IndexedDB, resets on panel open

### Phase 2: Board Templates + JSON Export/Import
- **6 Board Templates** — Blank, Software Development, Marketing, Event Planning, Personal, Bug Tracking
- **JSON Export** — download any board as a JSON file from the board dropdown
- **JSON Import** — import boards from JSON file (in board dropdown menu, live in production)

### Phase 3: Card Attachments (Dormant)
- **Full implementation** — upload/download/delete, drag-and-drop, image thumbnails, 10MB limit, paperclip badge on cards
- **Requires Firebase Blaze plan** — Storage rules written but not deployed; feature activates when Storage is enabled

### Phase 4: Enhanced Conflict Resolution
- **3-way merge** — base/local/remote board comparison with field-level diffs
- **Per-field resolution UI** — side-by-side diff with mine/theirs radio buttons
- **Bulk actions** — "Keep all mine" / "Use all remote"
- **Auto-resolve** — non-conflicting changes merged automatically

### Phase 5: Analytics Panel + Health Dashboard
- **Analytics Panel** — card counts by column, priority distribution, top tags, checklist progress, activity heatmap, card age, weekly velocity
- **Health Dashboard** — modal showing sync state, network status, pending operations, board sizes, browser storage usage

### Bug Fixes & Enhancements
- **Card Activity Timeline** — per-card activity history inside CardModal
- **Expanded activity logging** — tracks all card field changes
- **UI preferences persistence** — dedicated localStorage keys for darkMode/zoomLevel
- **Search filter fix** — blur handler checks relatedTarget
- **Activity badge fix** — race condition resolved

### Foundation
- **Per-User Preference Persistence** (dark mode + zoom isolated per account)
- **Performance Optimization** (first load JS 450 kB → 325 kB, -28%)
- **Default Board Fix** — Custom Zustand persist merge prevents rehydration wipe
- **Error Boundary** — Runtime errors display instead of blank page
- **Enhanced Conflict Detection** (multi-device safety, 3-way merge)
- **Disaster Recovery MVP** (IndexedDB + Sync Queue + Enhanced Status)
- **Page Zoom Control** (50-150% range, persisted)
- **Dark Mode Preference Sync** (persisted via dedicated localStorage + Firestore)
- **Production Hardening** (console stripped, hydration fixed, COOP header, skipHydration)
- **Collaboration Features** (comments, @mentions, notifications, presence, board sharing)
- **Pro feature gating** + AI-generated instructions
- **Role-based permissions** (Firestore rules + frontend)
- **Keyboard shortcuts & confetti celebration**
- **Calendar View** — alternate board layout with due-date cards on calendar grid

---

## Next on Roadmap (By Priority)

### Ready When Needed
- **Enable Attachments** — upgrade to Firebase Blaze, deploy storage rules, feature is already built

### Potential Future Features (pending user feedback)
- **Recurring Tasks** — auto-create cards on schedule (client-side, no infra)
- **Email Notifications** — digest of activity (requires Cloud Function)
- **Automated Backups** — scheduled Firestore exports or Cloud Function snapshots
- **Burndown Chart** — true burndown requires historical snapshots (more complex)

---

## Production Readiness: ~97%
All core features deployed and tested. Full collaboration, offline sync, conflict resolution, analytics, dependencies, velocity tracking, templates, import/export, and activity logging all live. Attachments built but gated on Firebase Blaze upgrade. Pausing for user feedback before next sprint.
