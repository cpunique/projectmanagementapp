'use client';

import dynamic from 'next/dynamic';
import { useKanbanStore } from '@/lib/store';
import { useAuth } from '@/lib/firebase/AuthContext';
import { DueDatePanel } from '@/components/kanban/DueDatePanel';
import { DueDatePanelToggleButton } from '@/components/ui/DueDatePanelToggleButton';

const ActivityFeedPanel = dynamic(() => import('@/components/kanban/ActivityFeedPanel'), { ssr: false });
const AnalyticsPanel = dynamic(() => import('@/components/kanban/AnalyticsPanel'), { ssr: false });
const ArchivePanel = dynamic(() => import('@/components/kanban/ArchivePanel'), { ssr: false });
const CalendarView = dynamic(() => import('@/components/kanban/CalendarView'), { ssr: false });
const MobileSearch = dynamic(() => import('@/components/ui/MobileSearch'), { ssr: false });

interface BoardWithPanelProps {
  children: React.ReactNode;
}

export function BoardWithPanel({ children }: BoardWithPanelProps) {
  const { openPanel, activeView, boards, activeBoard, mobileAlertsOpen, mobileSearchOpen, dueDatePanelWidth, dueDatePanelResizing } = useKanbanStore();
  const { user } = useAuth();

  // Calculate total cards with due dates for badge
  const board = boards.find((b) => b.id === activeBoard);
  const cardsWithDueDates = board
    ? board.columns.flatMap((col) => col.cards.filter((card) => card.dueDate && !card.archived)).length
    : 0;

  // Derive canEdit for CalendarView
  const canEdit = (() => {
    if (!board || !user) return false;
    const collab = board.sharedWith?.find((c) => c.userId === user.uid);
    if (board.ownerId === user.uid) return true;
    if (collab?.role === 'editor') return true;
    // Demo mode: board has no ownerId set
    if (!board.ownerId) return true;
    return false;
  })();

  const anyPanelOpen = openPanel !== null;
  const activePanelWidth = openPanel === 'dueDates' ? dueDatePanelWidth : openPanel !== null ? 320 : 0;
  // During DueDate resize, use a CSS var updated directly on every mousemove tick
  // (no React state churn — avoids Firestore quota pressure from rapid store updates).
  // For all other states, use the committed store value with a smooth transition.
  const paddingRightValue = dueDatePanelResizing
    ? `var(--due-date-panel-width, ${dueDatePanelWidth}px)`
    : `${activePanelWidth}px`;

  return (
    <div className="flex h-full w-full">
      {/* Board / Calendar + mobile tab bar column */}
      <div
        className="flex flex-col flex-1 min-w-0 overflow-hidden"
        style={{
          paddingRight: paddingRightValue,
          transition: dueDatePanelResizing ? 'none' : 'padding-right 0.3s ease-out',
        }}
      >
        {/* View container */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden min-w-0">
          {activeView === 'calendar' && activeBoard
            ? <CalendarView boardId={activeBoard} canEdit={canEdit} />
            : children
          }
        </div>

        {/* Mobile bottom tab bar — persists across Board and Calendar views */}
        <div
          className="lg:hidden flex-shrink-0 flex items-center justify-around"
          style={{
            background: 'rgba(29,26,23,.9)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            borderTop: '1px solid var(--border)',
            height: 66,
            paddingBottom: 'calc(8px + env(safe-area-inset-bottom))',
            position: 'relative',
            zIndex: 15,
          }}
        >
          {[
            { label: 'Board', icon: '⊞', active: activeView === 'board', onClick: () => useKanbanStore.getState().setActiveView('board') },
            { label: 'Calendar', icon: '📅', active: activeView === 'calendar', onClick: () => useKanbanStore.getState().setActiveView('calendar') },
            { label: 'Search', icon: '⌕', active: mobileSearchOpen, onClick: () => useKanbanStore.getState().setMobileSearchOpen(true) },
            { label: 'Alerts', icon: '🔔', active: mobileAlertsOpen, onClick: () => useKanbanStore.getState().setMobileAlertsOpen(true) },
          ].map(({ label, icon, active, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              className="flex flex-col items-center justify-center border-none bg-transparent font-sans"
              style={{
                color: active ? 'var(--purple-l)' : 'var(--muted)',
                fontSize: '10px',
                gap: '4px',
              }}
            >
              <span className="leading-none" style={{
                fontSize: '19px',
                filter: active ? 'drop-shadow(0 0 6px var(--glow))' : undefined,
              }}>
                {icon}
              </span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Search full-screen takeover */}
      {mobileSearchOpen && (
        <MobileSearch onClose={() => useKanbanStore.getState().setMobileSearchOpen(false)} />
      )}

      {/* Side Panels - Desktop (position: fixed; no longer in flex flow) */}
      <div className="hidden md:block">
        <ArchivePanel />
        <ActivityFeedPanel />
        <AnalyticsPanel />
        <DueDatePanel />
      </div>

      {/* Mobile Toggle Button and Overlay Panel */}
      <div className="md:hidden">
        {/* Toggle Button - Fixed in bottom right on mobile */}
        <DueDatePanelToggleButton badge={cardsWithDueDates} />

        {/* Backdrop when panel is open on mobile */}
        {anyPanelOpen && (
          <div
            className="fixed inset-0 top-16 bg-black/50 z-20 md:hidden"
            onClick={() => useKanbanStore.getState().setOpenPanel(null)}
          />
        )}

        {/* Panels on mobile */}
        {openPanel === 'dueDates' && <DueDatePanel />}
        {openPanel === 'activity' && <ActivityFeedPanel />}
        {openPanel === 'analytics' && <AnalyticsPanel />}
        {openPanel === 'archive' && <ArchivePanel />}
      </div>
    </div>
  );
}
