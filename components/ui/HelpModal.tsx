'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { createPortal } from 'react-dom';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabId =
  | 'getting-started'
  | 'boards'
  | 'cards'
  | 'search'
  | 'panels'
  | 'collaboration'
  | 'sync'
  | 'shortcuts'
  | 'ai';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { id: 'getting-started', label: 'Getting Started', icon: '🚀' },
  { id: 'boards', label: 'Boards', icon: '📋' },
  { id: 'cards', label: 'Cards', icon: '🗂️' },
  { id: 'search', label: 'Search & Filters', icon: '🔍' },
  { id: 'panels', label: 'Panels & Views', icon: '📊' },
  { id: 'collaboration', label: 'Collaboration', icon: '👥' },
  { id: 'sync', label: 'Sync & Offline', icon: '☁️' },
  { id: 'shortcuts', label: 'Shortcuts', icon: '⌨️' },
  { id: 'ai', label: 'AI Instructions', icon: '✨' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 last:mb-0">
      <h3 style={{
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.7px',
        textTransform: 'uppercase',
        color: 'var(--purple-l)',
        marginBottom: '10px',
        paddingBottom: '8px',
        borderBottom: '1px solid var(--border)',
        display: 'block',
      }}>
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="text-sm font-medium min-w-[140px] shrink-0" style={{ color: 'var(--text)' }}>{label}</span>
      <span className="text-sm" style={{ color: 'var(--body)' }}>{children}</span>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mt-3 flex gap-2 rounded-lg px-3 py-2"
      style={{
        background: 'rgba(147,51,234,.10)',
        border: '1px solid rgba(147,51,234,.25)',
      }}
    >
      <span className="shrink-0" style={{ color: 'var(--purple-l)' }}>💡</span>
      <p className="text-xs" style={{ color: 'var(--purple-l)' }}>{children}</p>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded text-[11px] font-mono font-medium shadow-sm mx-0.5"
      style={{
        background: 'var(--surface-3)',
        border: '1px solid var(--border-2)',
        color: 'var(--text)',
      }}
    >
      {children}
    </kbd>
  );
}

function ShortcutRow({ description, keys }: { description: string; keys: string[] }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm" style={{ color: 'var(--body)' }}>{description}</span>
      <div className="flex gap-1 ml-4">
        {keys.map((k) => (
          <Kbd key={k}>{k}</Kbd>
        ))}
      </div>
    </div>
  );
}

function GettingStartedTab() {
  return (
    <div>
      <Section title="Welcome to Kan-do">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--body)' }}>
          Kan-do is a visual project management tool that helps you organize work into boards, columns, and cards.
          Think of it as a digital whiteboard with sticky notes — but with real-time collaboration, file attachments,
          analytics, and offline support.
        </p>
      </Section>

      <Section title="The Basics">
        <Item label="Boards">A board represents a project or area of work. Switch between boards using the dropdown in the center of the header.</Item>
        <Item label="Columns">Each board has columns (e.g. To Do, In Progress, Done) that represent stages of your workflow.</Item>
        <Item label="Cards">Cards are individual tasks or items. Drag them between columns to move them through your workflow.</Item>
      </Section>

      <Section title="First Steps">
        <div className="space-y-3">
          <div className="flex gap-3 items-start">
            <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
            <p className="text-sm" style={{ color: 'var(--body)' }}>
              <strong style={{ color: 'var(--text)' }}>Create a board</strong> — Click the board name in the header, then "New Board". Pick a template or start blank.
            </p>
          </div>
          <div className="flex gap-3 items-start">
            <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
            <p className="text-sm" style={{ color: 'var(--body)' }}>
              <strong style={{ color: 'var(--text)' }}>Add cards</strong> — Click "Add Card" at the bottom of any column, or press <Kbd>N</Kbd> to add to the first column.
            </p>
          </div>
          <div className="flex gap-3 items-start">
            <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
            <p className="text-sm" style={{ color: 'var(--body)' }}>
              <strong style={{ color: 'var(--text)' }}>Move cards</strong> — Drag a card to a different column or position. Right-click for a move menu.
            </p>
          </div>
          <div className="flex gap-3 items-start">
            <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
            <p className="text-sm" style={{ color: 'var(--body)' }}>
              <strong style={{ color: 'var(--text)' }}>Save your work</strong> — Click the purple <strong style={{ color: 'var(--text)' }}>Save</strong> button that appears when you have unsaved changes.
            </p>
          </div>
        </div>
        <Tip>Your changes are saved locally immediately. The Save button syncs them to the cloud so you can access them from any device.</Tip>
      </Section>

      <Section title="Header at a Glance">
        <Item label="Left — Logo">App name and branding (text hidden on very small phones to save space).</Item>
        <Item label="Center — Board Switcher">Switch, create, rename, share, clone, and export boards.</Item>
        <Item label="View toggle">Board / Calendar segmented control (desktop) — switch between the Kanban board and your Calendar view.</Item>
        <Item label="Right — Controls">
          Search icon, Notification bell, Save button, ⋮ More menu (Archive, Analytics, Due Dates, Activity feed, Help, Keyboard Shortcuts), and User menu.
        </Item>
        <Item label="Mobile">On phones, the header shows the Notification bell, Save button, and User menu. View switching (Board/Calendar) and Search/Alerts move to the bottom tab bar. Board switching stays in the header on wider phones.</Item>
      </Section>
    </div>
  );
}

function BoardsTab() {
  return (
    <div>
      <Section title="Creating Boards">
        <Item label="New Board">Click the board name dropdown in the header → "New Board".</Item>
        <Item label="Templates">Choose from 6 pre-made templates: Blank, Software Development, Marketing Campaign, Event Planning, Personal Tasks, or Bug Tracking. Each comes with pre-configured columns.</Item>
        <Item label="Custom Name">Enter any name when creating a board.</Item>
      </Section>

      <Section title="Managing Boards">
        <Item label="Switch Board">Click the board dropdown in the center of the header and select any board.</Item>
        <Item label="Rename">Open the board dropdown → double-click a board name to edit it inline. Press Enter to confirm or Esc to cancel.</Item>
        <Item label="Delete">Board dropdown → delete (not available if it's your only board).</Item>
        <Item label="Clone Board">Duplicate a board with all its columns and cards under a new name.</Item>
        <Item label="Set Default">Star icon next to a board — this board opens automatically when you log in.</Item>
        <Item label="Export JSON">Board dropdown → Export. Downloads a JSON file of the board (or all boards). Useful for backups.</Item>
      </Section>

      <Section title="Board Backgrounds">
        <Item label="9 Presets">Choose a gradient or solid color background: Default, Ocean, Sunset, Sky, Forest, Rose, Navy, Dark, or Teal.</Item>
        <Item label="Where to Set">Click the palette icon in the board header or board settings area.</Item>
      </Section>

      <Section title="Columns">
        <Item label="Add Column">Click "Add Column" at the far right of the board.</Item>
        <Item label="Rename">Click a column title to edit it inline.</Item>
        <Item label="Reorder">Drag the column header to rearrange.</Item>
        <Item label="Delete">Column options → Delete.</Item>
        <Item label="WIP Limit">Set a maximum number of cards per column. The WIP limit counter turns red and shows a ⚠ warning when you exceed the limit — a visual cue to focus on finishing before starting new work.</Item>
      </Section>

      <Section title="Smart Columns">
        <Item label="Done columns">Columns named "Done", "Completed", "Finished", "Closed", or "Delivered" are treated as completed — cards in them are excluded from the Due Dates panel.</Item>
        <Item label="Descoped columns">Columns named "Descoped" or "Out of scope" automatically mark cards moved into them with a "descoped" status (shown with strikethrough).</Item>
      </Section>
    </div>
  );
}

function CardsTab() {
  return (
    <div>
      <Section title="Creating Cards">
        <Item label="Add Card button">Click "Add Card" at the bottom of any column.</Item>
        <Item label="Keyboard shortcut">Press <Kbd>N</Kbd> to add a card to the first column.</Item>
        <Item label="Right-click menu">Right-click anywhere on the board to access card creation options.</Item>
      </Section>

      <Section title="Card Fields">
        <Item label="Title">The card name — shown on the board. Required.</Item>
        <Item label="Description">A short summary shown on the card front.</Item>
        <Item label="Notes">Rich-text editor (bold, italic, lists, code blocks) for detailed information. Up to 10,000 characters.</Item>
        <Item label="Priority">Low (green), Medium (amber), or High (red). Shown as a colored badge on the card.</Item>
        <Item label="Due Date">Set a target completion date. Overdue cards are highlighted and appear in the Due Dates panel.</Item>
        <Item label="Tags">Custom labels with individually chosen colors. Add as many as you like — they're searchable by typing the tag name.</Item>
        <Item label="Card Color">A color strip across the top of the card for visual organization. Choose from 9 colors or leave as default.</Item>
        <Item label="Checklist">Sub-tasks within a card. A progress bar shows completion percentage on the card face.</Item>
        <Item label="Comments">Threaded discussion on the card. Supports @mentions to notify collaborators.</Item>
        <Item label="Attachments">Upload files (images, PDFs, Word, Excel, CSV, TXT). Max 10MB per file, 10 files per card. Images show a thumbnail.</Item>
        <Item label="Activity">A history tab in the card modal shows every change made to the card — who moved it, what was edited, when comments were added.</Item>
      </Section>

      <Section title="Card Operations">
        <Item label="Open / Edit">Click the card to open its detail modal.</Item>
        <Item label="Drag & Drop">Drag a card to a different column or position within a column.</Item>
        <Item label="Right-click menu">Right-click a card for quick actions: edit, move to column, or delete.</Item>
        <Item label="Delete">Open the card → delete button, or right-click → delete.</Item>
        <Item label="Unread badge">A purple dot on a card means there are unread comments from collaborators.</Item>
      </Section>

      <Tip>Card color strips are great for grouping related cards visually across columns — for example, all "frontend" tasks in blue and "backend" tasks in green.</Tip>
    </div>
  );
}

function SearchTab() {
  return (
    <div>
      <Section title="Opening Search">
        <Item label="Desktop">Click the 🔍 search icon in the header. A floating glass panel drops down below it.</Item>
        <Item label="Keyboard shortcut">Press <Kbd>Ctrl</Kbd>/<Kbd>⌘</Kbd> + <Kbd>/</Kbd> to open and focus the search panel from anywhere on the board.</Item>
        <Item label="Mobile">Tap the Search tab in the bottom tab bar — a full-screen search overlay opens.</Item>
      </Section>

      <Section title="Scope Toggle">
        <Item label="This board">Searches cards on your active board only. Results appear instantly as you type.</Item>
        <Item label="All boards">Searches across every board you have access to. Results are grouped by board name. Clicking a result switches to that board and opens the card.</Item>
        <Item label="Switching scope">Click "This board" or "All boards" at the top of the search panel. Your last-used scope is remembered.</Item>
      </Section>

      <Section title="What It Searches">
        <Item label="Fields">Card titles, descriptions, and tags.</Item>
        <Item label="Results">Shown as a flat list in the panel — card title, column name, and due date (if set). Title matches are highlighted in purple.</Item>
        <Item label="Navigate">Click any result to jump to that card. If it's on a different board, the board switches automatically.</Item>
      </Section>

      <Section title="Filters">
        <Item label="Priority chips">High / Med / Low buttons in the panel header. Multi-select — combine High + Med, or any combination.</Item>
        <Item label="Overdue">Show only cards past their due date. Works in both This board and All boards scopes.</Item>
        <Item label="Combining">Text search and filter chips stack — "login bug" + High priority shows only high-priority cards with "login bug" in their title, description, or tags.</Item>
        <Item label="Match count">The panel shows a live count ("3 matches on this board" or "7 matches across 2 boards") as you type.</Item>
      </Section>

      <Section title="Clearing Search">
        <Item label="Clear text">Click the ✕ button inside the input field.</Item>
        <Item label="Close panel">Press <Kbd>Esc</Kbd> to clear search and close the panel. Click outside the panel to close while keeping any active filters.</Item>
      </Section>

      <Tip>Use All-boards search to find a card when you can't remember which board it's on. Click the result to jump straight to it.</Tip>
    </div>
  );
}

function PanelsTab() {
  return (
    <div>
      <Section title="Opening Panels">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--body)' }}>
          All panels are opened from the <strong style={{ color: 'var(--text)' }}>⋮ More</strong> menu in the top-right of the header (desktop). Each panel slides in from the right side of the board and can be open simultaneously with others. On mobile, tap the Alerts tab in the bottom tab bar to access notifications.
        </p>
      </Section>

      <Section title="Due Dates Panel  📅">
        <Item label="Open">⋮ More → Due Dates. The label shows a count when cards have due dates set.</Item>
        <Item label="Content">All cards with a due date, sorted by urgency (overdue first, then soonest due). Excludes cards in "Done" columns.</Item>
        <Item label="Click to navigate">Click a card in the panel to scroll to it on the board.</Item>
        <Item label="Resize">Drag the left edge of the panel to resize it (280–600px). Your preferred width is saved.</Item>
      </Section>

      <Section title="Activity Feed Panel  ⏰">
        <Item label="Open">⋮ More → Activity. The label shows an unread count when you have unseen activity.</Item>
        <Item label="Content">A live, chronological feed of everything happening on the board: cards added/moved/edited, columns changed, comments posted, board shared.</Item>
        <Item label="Real-time">Updates live as collaborators make changes — no refresh needed.</Item>
        <Item label="Unread tracking">Activity is marked as "seen" when you open the panel. The count clears automatically.</Item>
        <Item label="Actors">Each event shows who performed the action and when (e.g. "2 minutes ago").</Item>
      </Section>

      <Section title="Analytics Panel  📊">
        <Item label="Open">⋮ More → Analytics.</Item>
        <Item label="Content">
          Visual breakdown of your board: total cards, completion rate, priority distribution, cards per column (bar chart), tag frequency, card age distribution, and a 14-day activity heatmap.
        </Item>
        <Item label="Live updates">Reflects your current board state in real-time.</Item>
      </Section>

      <Section title="Archive Panel  📦">
        <Item label="Open">⋮ More → Archive.</Item>
        <Item label="Content">Cards that have been archived (removed from active columns but not deleted). You can review and restore them at any time.</Item>
      </Section>

      <Section title="Calendar View  📅">
        <Item label="Switch views">Click Calendar in the Board / Calendar toggle in the header (desktop), or tap the Calendar tab on mobile.</Item>
        <Item label="Content">All cards with a due date, laid out on a monthly calendar grid. Cards without due dates don't appear here.</Item>
        <Item label="Navigate">Use the arrow buttons to go forward or back by month.</Item>
      </Section>

      <Tip>The Activity Feed is the fastest way to catch up after being away — scroll it to see what your team did while you were offline.</Tip>
    </div>
  );
}

function CollaborationTab() {
  return (
    <div>
      <Section title="Sharing a Board">
        <Item label="Open Share">Open the board switcher dropdown → click the ⎇ share icon next to the board you own → enter email addresses to invite collaborators.</Item>
        <Item label="Viewer role">Can see the board and all cards but cannot make any changes.</Item>
        <Item label="Editor role">Full access — can create, edit, move, and delete cards and columns.</Item>
        <Item label="Change roles">Board owner can upgrade/downgrade collaborators at any time.</Item>
        <Item label="Remove access">Board owner can remove any collaborator.</Item>
      </Section>

      <Section title="Live Presence">
        <Item label="Online indicators">Collaborator avatars appear in the board header when others are viewing the same board.</Item>
        <Item label="Hover for name">Hover over an avatar to see the user's name.</Item>
        <Item label="Real-time">Presence updates instantly as people open and close the board.</Item>
      </Section>

      <Section title="Mentions & Notifications">
        <Item label="How to mention">Type @ in any comment field. An autocomplete dropdown shows all board collaborators.</Item>
        <Item label="Notification sent">The mentioned user gets a notification in their notification bell (🔔).</Item>
        <Item label="Bell icon">The notification bell in the header shows an unread count badge. Click to see all mentions.</Item>
        <Item label="Actions">Mark individual notifications as read, mark all as read, or clear all.</Item>
        <Item label="Navigate">Click a notification to jump directly to the card where you were mentioned.</Item>
      </Section>

      <Section title="Conflict Resolution">
        <Item label="What is it?">If you and a collaborator edit the same board simultaneously while one of you is offline, a conflict can occur when syncing.</Item>
        <Item label="Detection">The app automatically detects when your local version diverges from the cloud version.</Item>
        <Item label="Field-level merge">A detailed merge panel lets you compare changes field by field and choose which version to keep for each — or use "Keep all mine" / "Use all remote" for bulk resolution.</Item>
        <Item label="No data loss">Both versions are always shown — you decide what to keep.</Item>
      </Section>

      <Tip>Set a board as your "default" (star icon in board switcher) so it opens automatically each time you log in — useful when you share multiple boards with different teams.</Tip>
    </div>
  );
}

function SyncTab() {
  return (
    <div>
      <Section title="Sync Status Indicator">
        <Item label="Location">In the header, to the left of the user menu.</Item>
        <Item label="Synced ✓">All changes are saved to the cloud. Auto-hides after 2 seconds.</Item>
        <Item label="Syncing ↻">An upload is in progress.</Item>
        <Item label="Offline ⚠">No internet connection. Changes are queued locally.</Item>
        <Item label="Error ✕">A sync failed. A Retry button appears — click it to try again.</Item>
      </Section>

      <Section title="Save Button">
        <Item label="When it appears">The purple Save button shows whenever you have unsaved changes (also indicated by an amber pulsing dot).</Item>
        <Item label="Click to save">Immediately syncs the current board to the cloud.</Item>
        <Item label="Keyboard">Press <Kbd>Ctrl</Kbd>/<Kbd>⌘</Kbd> + <Kbd>S</Kbd> to save from anywhere.</Item>
        <Item label="Local-first">Your changes are always saved locally first (via your browser's local storage), so you never lose work even if Firebase is unavailable.</Item>
      </Section>

      <Section title="Offline Mode">
        <Item label="Automatic">The app detects when you go offline and switches to offline mode automatically.</Item>
        <Item label="Keep working">You can create, edit, and move cards while offline — all changes queue up.</Item>
        <Item label="Auto-sync">When your connection returns, queued changes sync automatically. A progress indicator shows X/Y operations completed.</Item>
        <Item label="Status display">"Offline (N queued)" appears in the sync status when you have pending operations.</Item>
      </Section>

      <Tip>The app uses a local queue for offline operations — your changes survive browser restarts while offline and sync automatically when you're back online.</Tip>
    </div>
  );
}

function AITab() {
  return (
    <div>
      {/* Pro banner */}
      <div className="flex items-center gap-3 mb-5 p-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <span className="text-3xl">✨</span>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-bold text-base">AI Instructions</p>
            <span className="text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full">Pro</span>
          </div>
          <p className="text-sm text-purple-100 mt-0.5">
            Generate step-by-step implementation instructions for any card using AI.
          </p>
        </div>
      </div>

      <Section title="What It Does">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--body)' }}>
          The AI Instructions feature reads your card's details and generates a ready-to-use prompt that you can paste into any AI tool (ChatGPT, Claude, Gemini, etc.) to get detailed implementation guidance.
          The generated instructions are tailored to the card's context — title, priority, checklist items, tags, and your project description.
        </p>
      </Section>

      <Section title="How to Access">
        <Item label="Open a card">Click any card on the board to open its detail modal.</Item>
        <Item label="Spark icon">Click the ✨ spark / lightning bolt icon in the card modal header or toolbar.</Item>
        <Item label="Free vs Pro">Free plan users get one free lifetime generation; after that, an upgrade prompt appears. Pro users have unlimited generations.</Item>
      </Section>

      <Section title="Step 1 — Configure">
        <p className="text-sm mb-3" style={{ color: 'var(--body)' }}>
          Before generating, choose what context to include and which instruction style to use.
        </p>
        <Item label="Instruction Style">Choose how the AI should frame the output:</Item>
        <div className="ml-4 mt-2 space-y-1.5">
          <div className="flex gap-2 text-sm">
            <span>💻</span>
            <div>
              <strong style={{ color: 'var(--text)' }}>Development</strong>{' '}
              <span style={{ color: 'var(--body)' }}>— Technical implementation instructions for developers (code, architecture, APIs).</span>
            </div>
          </div>
          <div className="flex gap-2 text-sm">
            <span>📋</span>
            <div>
              <strong style={{ color: 'var(--text)' }}>General Tasks</strong>{' '}
              <span style={{ color: 'var(--body)' }}>— Simple actionable steps anyone can follow, no technical jargon.</span>
            </div>
          </div>
          <div className="flex gap-2 text-sm">
            <span>📅</span>
            <div>
              <strong style={{ color: 'var(--text)' }}>Event Planning</strong>{' '}
              <span style={{ color: 'var(--body)' }}>— Timelines, logistics, preparation checklists, and coordination steps.</span>
            </div>
          </div>
          <div className="flex gap-2 text-sm">
            <span>📝</span>
            <div>
              <strong style={{ color: 'var(--text)' }}>Documentation</strong>{' '}
              <span style={{ color: 'var(--body)' }}>— Guides, explanations, how-tos, and reference material.</span>
            </div>
          </div>
          <div className="flex gap-2 text-sm">
            <span>🔬</span>
            <div>
              <strong style={{ color: 'var(--text)' }}>Research</strong>{' '}
              <span style={{ color: 'var(--body)' }}>— Structured research plans: key questions, sources to consult, how to evaluate and synthesize findings.</span>
            </div>
          </div>
        </div>
        <div className="mt-3">
          <Item label="Board default">The style defaults to whatever your board's "Purpose" is set to. You can override it per-generation.</Item>
        </div>
        <div className="mt-3">
          <Item label="Card data to include">Check or uncheck which card fields to send to the AI:</Item>
          <div className="ml-4 mt-1.5 space-y-1 text-sm" style={{ color: 'var(--body)' }}>
            <p>• <strong style={{ color: 'var(--text)' }}>Title</strong> — always included, can't be removed</p>
            <p>• <strong style={{ color: 'var(--text)' }}>Description</strong> — the card's short summary</p>
            <p>• <strong style={{ color: 'var(--text)' }}>Notes</strong> — detailed rich-text content</p>
            <p>• <strong style={{ color: 'var(--text)' }}>Checklist</strong> — sub-tasks (shows count)</p>
            <p>• <strong style={{ color: 'var(--text)' }}>Tags</strong> — labels attached to the card</p>
            <p>• <strong style={{ color: 'var(--text)' }}>Priority</strong> — low / medium / high</p>
            <p>• <strong style={{ color: 'var(--text)' }}>Project Context</strong> — your board's description (only shown if the board has a description set)</p>
          </div>
        </div>
        <Tip>The more context you include, the more specific and useful the generated instructions will be. For complex technical cards, including Notes and Checklist makes a big difference.</Tip>
      </Section>

      <Section title="Step 2 — Generate">
        <Item label="Click Generate">The app sends your card data securely to the AI API. A spinner appears while it processes (usually a few seconds).</Item>
        <Item label="Authentication">Your Firebase auth token is used — only authenticated Pro users can call the API.</Item>
      </Section>

      <Section title="Step 3 — Review & Use">
        <Item label="Editable output">The generated instructions appear in a text area. You can edit them directly before copying.</Item>
        <Item label="Character count">Shown below the text area so you know how much context you're working with.</Item>
        <Item label="Copy to Clipboard">Click "Copy to Clipboard" to copy the full instructions. Paste into ChatGPT, Claude, or any AI tool.</Item>
        <Item label="Save to Card">Click "Save to Card" to store the instructions on the card permanently. Next time you open the AI modal for this card, the saved instructions load immediately.</Item>
        <Item label="Regenerate">Click "Regenerate" to go back to Step 1 and generate a new version (e.g. with different style or fields).</Item>
      </Section>

      <Section title="Generate Task Cards">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>What it does</span>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(147,51,234,.15)', color: 'var(--purple-l)' }}
          >
            Pro
          </span>
        </div>
        <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--body)' }}>
          Describe a goal and AI generates a full set of task cards — each with a title, priority, and description — ready to add to your board in one click.
        </p>
        <Item label="How to open">Click the ✦ sparkle icon in the board header (next to the board name area).</Item>
        <Item label="Step 1 — Describe your goal">Type what you want to build or accomplish (e.g. "Build a user authentication system"). Choose a planning style that matches your project type.</Item>
        <Item label="Step 2 — AI generates">The AI produces an overview and a list of task cards, each with a suggested title, priority (low / medium / high), and a short description.</Item>
        <Item label="Step 3 — Review & create">Toggle individual cards on or off, edit any title inline, then click "Create Cards". Selected cards are added to the first column of your board.</Item>
        <Item label="Planning styles">Same five styles as AI Instructions — Development, General Tasks, Event Planning, Documentation, Research. Defaults to your board's Purpose setting.</Item>
        <Item label="Destination column">Cards always land in the first (leftmost) non-archived column. Move them from there as needed.</Item>
        <Tip>Generate Task Cards is great for bootstrapping a new board — describe your project goal and get a structured backlog in seconds instead of creating cards one by one.</Tip>
      </Section>

      <Section title="Board Purpose Setting">
        <Item label="What it is">Each board has a "Purpose" that sets the default instruction style for all cards on that board.</Item>
        <Item label="Where to set">In the board header — look for the purpose badge (e.g. "Development" or "General Tasks") and click it to change.</Item>
        <Item label="Why it matters">Setting the right purpose means every card on the board defaults to the correct instruction style without needing to change it manually.</Item>
      </Section>
    </div>
  );
}

function ShortcutsTab() {
  return (
    <div>
      <Section title="Navigation">
        <ShortcutRow description="Show keyboard shortcuts" keys={['?']} />
        <ShortcutRow description="Close modal or cancel" keys={['Esc']} />
      </Section>

      <Section title="Search">
        <ShortcutRow description="Open card search panel" keys={['Ctrl', '/']} />
      </Section>

      <Section title="Cards">
        <ShortcutRow description="Create new card (first column)" keys={['N']} />
      </Section>

      <Section title="Save">
        <ShortcutRow description="Save current board" keys={['Ctrl', 'S']} />
      </Section>

      <Section title="Panels">
        <p className="text-sm mb-2" style={{ color: 'var(--body)' }}>Panels (Analytics, Due Dates, Activity, Archive) are opened via the ⋮ More menu in the header.</p>
      </Section>

      <Section title="Tips">
        <div className="text-sm space-y-2" style={{ color: 'var(--body)' }}>
          <p>Keyboard shortcuts are disabled while a modal is open or when focus is in a text input — so typing <strong style={{ color: 'var(--text)' }}>N</strong> in a card title field won't accidentally create a new card.</p>
          <p>Press <Kbd>Esc</Kbd> to dismiss any open modal, dropdown, or panel.</p>
        </div>
      </Section>
    </div>
  );
}

const TAB_CONTENT: Record<TabId, React.ReactNode> = {
  'getting-started': <GettingStartedTab />,
  boards: <BoardsTab />,
  cards: <CardsTab />,
  search: <SearchTab />,
  panels: <PanelsTab />,
  collaboration: <CollaborationTab />,
  sync: <SyncTab />,
  shortcuts: <ShortcutsTab />,
  ai: <AITab />,
};

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('getting-started');
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) setActiveTab('getting-started');
  }, [isOpen]);

  if (typeof window === 'undefined') return null;

  const springTransition = prefersReducedMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 400, damping: 30 };

  const modalInitial = prefersReducedMotion
    ? { opacity: 0 }
    : { opacity: 0, scale: 0.95, y: 10 };

  const modalAnimate = { opacity: 1, scale: 1, y: 0 };

  const modalExit = prefersReducedMotion
    ? { opacity: 0 }
    : { opacity: 0, scale: 0.95, y: 10 };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Help guide"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />

          {/* Outer wrapper: animation only — no bg, no backdrop-filter (breaks under transform) */}
          <motion.div
            initial={modalInitial}
            animate={modalAnimate}
            exit={modalExit}
            transition={springTransition}
            className="relative w-full max-w-3xl"
            style={{ height: '80vh' }}
          >
            {/* Inner: glass panel — static div, no transform, so backdrop-filter renders */}
            <div
              style={{
                width: '100%',
                height: '100%',
                background: 'rgba(29, 26, 23, 0.88)',
                backdropFilter: 'blur(24px) saturate(1.2)',
                WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
                border: '1px solid rgba(255,255,255,.07)',
                borderRadius: '16px',
                boxShadow: 'var(--shadow-3)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-6 py-4 shrink-0"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'var(--purple)' }}
                  >
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Help Guide</h2>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>Everything you need to know about Kan-do</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: 'var(--muted)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.06)'; e.currentTarget.style.color = 'var(--body)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--muted)'; }}
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body: tabs + content */}
              <div className="flex flex-1 overflow-hidden">
                {/* Sidebar nav */}
                <nav
                  className="w-44 shrink-0 overflow-y-auto py-2"
                  style={{ borderRight: '1px solid var(--border)' }}
                >
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left"
                      style={
                        activeTab === tab.id
                          ? {
                              background: 'rgba(147,51,234,.15)',
                              color: 'var(--purple-l)',
                              fontWeight: 500,
                              borderRight: '2px solid var(--purple)',
                            }
                          : { color: 'var(--body)' }
                      }
                      onMouseEnter={(e) => {
                        if (activeTab !== tab.id) e.currentTarget.style.background = 'rgba(255,255,255,.04)';
                      }}
                      onMouseLeave={(e) => {
                        if (activeTab !== tab.id) e.currentTarget.style.background = '';
                      }}
                    >
                      <span className="text-base leading-none">{tab.icon}</span>
                      <span className="leading-tight">{tab.label}</span>
                    </button>
                  ))}
                </nav>

                {/* Content pane */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, x: prefersReducedMotion ? 0 : 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: prefersReducedMotion ? 0 : -8 }}
                      transition={{ duration: prefersReducedMotion ? 0 : 0.12 }}
                    >
                      {TAB_CONTENT[activeTab]}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Footer */}
              <div
                className="px-6 py-3 shrink-0 flex items-center justify-between"
                style={{
                  background: 'var(--surface-1)',
                  borderTop: '1px solid var(--border)',
                }}
              >
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  Press <Kbd>Esc</Kbd> to close
                </p>
                <div className="flex gap-1.5 items-center">
                  {TABS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id)}
                      className="rounded-full transition-all"
                      style={{
                        width: activeTab === t.id ? '16px' : '6px',
                        height: '6px',
                        background: activeTab === t.id ? 'var(--purple)' : 'var(--border-2)',
                      }}
                      aria-label={`Go to ${t.label}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
