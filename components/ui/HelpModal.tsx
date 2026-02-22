'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
      <h3 className="text-sm font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-3 pb-1.5 border-b border-gray-200 dark:border-gray-700">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 min-w-[140px] shrink-0">{label}</span>
      <span className="text-sm text-gray-600 dark:text-gray-400">{children}</span>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 flex gap-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 px-3 py-2">
      <span className="text-purple-500 shrink-0">💡</span>
      <p className="text-xs text-purple-700 dark:text-purple-300">{children}</p>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-[11px] font-mono font-medium text-gray-700 dark:text-gray-300 shadow-sm mx-0.5">
      {children}
    </kbd>
  );
}

function ShortcutRow({ description, keys }: { description: string; keys: string[] }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-700 dark:text-gray-300">{description}</span>
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
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
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
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong className="text-gray-800 dark:text-gray-200">Create a board</strong> — Click the board name in the header, then "New Board". Pick a template or start blank.
            </p>
          </div>
          <div className="flex gap-3 items-start">
            <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong className="text-gray-800 dark:text-gray-200">Add cards</strong> — Click "Add Card" at the bottom of any column, or press <Kbd>N</Kbd> to add to the first column.
            </p>
          </div>
          <div className="flex gap-3 items-start">
            <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong className="text-gray-800 dark:text-gray-200">Move cards</strong> — Drag a card to a different column or position. Right-click for a move menu.
            </p>
          </div>
          <div className="flex gap-3 items-start">
            <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong className="text-gray-800 dark:text-gray-200">Save your work</strong> — Click the purple <strong>Save</strong> button that appears when you have unsaved changes.
            </p>
          </div>
        </div>
        <Tip>Your changes are saved locally immediately. The Save button syncs them to the cloud so you can access them from any device.</Tip>
      </Section>

      <Section title="Header at a Glance">
        <Item label="Left — Logo">App name and branding.</Item>
        <Item label="Center — Board Switcher">Switch, create, rename, share, and export boards.</Item>
        <Item label="Right — Controls">
          Search, Save, Notifications, Sync status, User menu, Demo mode, Activity feed, Analytics, Due dates panel, Keyboard shortcuts, Zoom, and Dark mode toggle.
        </Item>
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
        <Item label="Rename">Open the board dropdown → hover over a board → rename option.</Item>
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
        <Item label="WIP Limit">Set a maximum number of cards per column. The column highlights red when you exceed the limit — a visual cue to focus on finishing before starting new work.</Item>
      </Section>

      <Section title="Smart Columns">
        <Item label="Done columns">Columns named "Done", "Completed", "Finished", "Closed", or "Delivered" are treated as completed — cards in them are excluded from the Due Dates panel.</Item>
        <Item label="Descoped columns">Columns named "Descoped", "Out of scope", or "Backlog" automatically mark cards moved into them with a "descoped" status (shown with strikethrough).</Item>
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
        <Item label="Notes">Rich-text editor (bold, italic, lists, code blocks) for detailed information. Up to 10KB.</Item>
        <Item label="Priority">Low (green), Medium (amber), or High (red). Shown as a colored badge on the card.</Item>
        <Item label="Due Date">Set a target completion date. Overdue cards are highlighted and appear in the Due Dates panel.</Item>
        <Item label="Tags">Custom labels with individually chosen colors. Add as many as you like — they're searchable and filterable.</Item>
        <Item label="Card Color">A color strip across the top of the card for visual organization. Choose from 9 colors or leave as default.</Item>
        <Item label="Checklist">Sub-tasks within a card. A progress bar shows completion percentage on the card face.</Item>
        <Item label="Comments">Threaded discussion on the card. Supports @mentions to notify collaborators.</Item>
        <Item label="Attachments">Upload files (images, PDFs, Word, Excel, CSV, TXT). Max 5MB per file, 10 files per card. Images show a thumbnail.</Item>
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
      <Section title="Search Bar">
        <Item label="Location">Click the search icon in the header (right of center). The bar expands inline.</Item>
        <Item label="What it searches">Card titles, descriptions, and tags — across all columns of the active board.</Item>
        <Item label="Real-time">Results filter as you type (300ms debounce — very fast).</Item>
        <Item label="Highlight">Matching text is highlighted in yellow on matching cards.</Item>
        <Item label="Clear">Click the ✕ inside the search bar, or press <Kbd>Esc</Kbd>.</Item>
      </Section>

      <Section title="Filters">
        <Item label="Priority">Toggle Low, Medium, and/or High. Multi-select — you can show just High, or High + Medium together.</Item>
        <Item label="Overdue">Show only cards that have passed their due date.</Item>
        <Item label="Tags">Filter by specific tags. Multi-select supported.</Item>
        <Item label="Active indicator">A badge on the filter icon shows how many filters are currently active.</Item>
        <Item label="Clear All">Single button resets all active search and filter criteria.</Item>
      </Section>

      <Section title="Combining Search and Filters">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Search and filters work together — you can type "login bug" in the search bar AND have "High priority" filter active at the same time. Only cards matching both criteria will show.
        </p>
      </Section>

      <Tip>Filters persist while you drag cards — so you can filter for "High priority" and drag those cards around without losing the filter state.</Tip>
    </div>
  );
}

function PanelsTab() {
  return (
    <div>
      <Section title="Due Dates Panel  📅">
        <Item label="Open">Click the 📅 calendar icon in the header. A red badge shows how many cards have due dates.</Item>
        <Item label="Content">All cards with a due date, sorted by urgency (overdue first, then soonest due). Excludes cards in "Done" columns.</Item>
        <Item label="Click to navigate">Clicking a card in the panel scrolls to it on the board.</Item>
        <Item label="Resize">Drag the left edge of the panel to resize it (280–600px). Your preferred width is saved.</Item>
      </Section>

      <Section title="Activity Feed Panel  🕐">
        <Item label="Open">Click the clock icon in the header. A purple badge shows unread activity count.</Item>
        <Item label="Content">A live, chronological feed of everything happening on the board: cards added/moved/edited, columns changed, comments posted, board shared.</Item>
        <Item label="Real-time">Updates live as collaborators make changes — no refresh needed.</Item>
        <Item label="Unread tracking">Activity is marked as "seen" when you open the panel. The badge clears automatically.</Item>
        <Item label="Actors">Each event shows who performed the action and when (e.g. "2 minutes ago").</Item>
      </Section>

      <Section title="Analytics Panel  📊">
        <Item label="Open">Click the bar chart icon in the header.</Item>
        <Item label="Content">
          Visual breakdown of your board: total cards, cards per column (bar chart), priority distribution, tag frequency, due date status (overdue / due soon / future), and completion percentage.
        </Item>
        <Item label="Live updates">Reflects your current board state in real-time.</Item>
      </Section>

      <Section title="Panel Tips">
        <p className="text-sm text-gray-600 dark:text-gray-400">All three panels can be open simultaneously. They stack from the right side of the board. You can also use the board alongside any combination of panels.</p>
        <Tip>The Activity Feed is the fastest way to catch up after being away — scroll it to see what your team did while you were offline.</Tip>
      </Section>
    </div>
  );
}

function CollaborationTab() {
  return (
    <div>
      <Section title="Sharing a Board">
        <Item label="Open Share">Board switcher dropdown → share icon on the board → Invite by email.</Item>
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

      <Section title="System Health Dashboard">
        <Item label="Open">Click the ℹ info icon next to the sync status in the header.</Item>
        <Item label="Shows">Network status, sync state, last sync time, pending operation count, local storage usage, board document sizes, and total card count.</Item>
        <Item label="Diagnose issues">If sync seems stuck, the health dashboard is the first place to check.</Item>
      </Section>

      <Tip>The app uses a local IndexedDB queue for offline operations — your changes survive browser restarts while offline and sync when you're back online.</Tip>
    </div>
  );
}

function AITab() {
  return (
    <div>
      {/* Pro badge */}
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
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          The AI Instructions feature reads your card's details and generates a ready-to-use prompt that you can paste into any AI tool (ChatGPT, Claude, Gemini, etc.) to get detailed implementation guidance.
          The generated instructions are tailored to the card's context — title, priority, checklist items, tags, and your project description.
        </p>
      </Section>

      <Section title="How to Access">
        <Item label="Open a card">Click any card on the board to open its detail modal.</Item>
        <Item label="Spark icon">Click the ✨ spark / lightning bolt icon in the card modal header or toolbar.</Item>
        <Item label="Pro required">If you're on the free plan, you'll see an upgrade prompt. Pro users have unlimited generations.</Item>
      </Section>

      <Section title="Step 1 — Configure">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Before generating, choose what context to include and which instruction style to use.
        </p>
        <Item label="Instruction Style">Choose how the AI should frame the output:</Item>
        <div className="ml-4 mt-2 space-y-1.5">
          <div className="flex gap-2 text-sm">
            <span>💻</span>
            <div><strong className="text-gray-800 dark:text-gray-200">Development</strong> <span className="text-gray-500 dark:text-gray-400">— Technical implementation instructions for developers (code, architecture, APIs).</span></div>
          </div>
          <div className="flex gap-2 text-sm">
            <span>📋</span>
            <div><strong className="text-gray-800 dark:text-gray-200">General Tasks</strong> <span className="text-gray-500 dark:text-gray-400">— Simple actionable steps anyone can follow, no technical jargon.</span></div>
          </div>
          <div className="flex gap-2 text-sm">
            <span>📅</span>
            <div><strong className="text-gray-800 dark:text-gray-200">Event Planning</strong> <span className="text-gray-500 dark:text-gray-400">— Timelines, logistics, preparation checklists, and coordination steps.</span></div>
          </div>
          <div className="flex gap-2 text-sm">
            <span>📝</span>
            <div><strong className="text-gray-800 dark:text-gray-200">Documentation</strong> <span className="text-gray-500 dark:text-gray-400">— Guides, explanations, how-tos, and reference material.</span></div>
          </div>
          <div className="flex gap-2 text-sm">
            <span>🔬</span>
            <div><strong className="text-gray-800 dark:text-gray-200">Research</strong> <span className="text-gray-500 dark:text-gray-400">— Structured research plans: key questions, sources to consult, how to evaluate and synthesize findings.</span></div>
          </div>
        </div>
        <div className="mt-3">
          <Item label="Board default">The style defaults to whatever your board's "Purpose" is set to. You can override it per-generation.</Item>
        </div>
        <div className="mt-3">
          <Item label="Card data to include">Check or uncheck which card fields to send to the AI:</Item>
          <div className="ml-4 mt-1.5 space-y-1 text-sm text-gray-600 dark:text-gray-400">
            <p>• <strong className="text-gray-700 dark:text-gray-300">Title</strong> — always included, can't be removed</p>
            <p>• <strong className="text-gray-700 dark:text-gray-300">Description</strong> — the card's short summary</p>
            <p>• <strong className="text-gray-700 dark:text-gray-300">Notes</strong> — detailed rich-text content</p>
            <p>• <strong className="text-gray-700 dark:text-gray-300">Checklist</strong> — sub-tasks (shows count)</p>
            <p>• <strong className="text-gray-700 dark:text-gray-300">Tags</strong> — labels attached to the card</p>
            <p>• <strong className="text-gray-700 dark:text-gray-300">Priority</strong> — low / medium / high</p>
            <p>• <strong className="text-gray-700 dark:text-gray-300">Project Context</strong> — your board's description (only shown if the board has a description set)</p>
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

      <Section title="Cards">
        <ShortcutRow description="Create new card (first column)" keys={['N']} />
      </Section>

      <Section title="Save">
        <ShortcutRow description="Save current board" keys={['Ctrl', 'S']} />
      </Section>

      <Section title="Panels">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Panel toggles are accessed via the header icons. Click the clock (🕐) for Activity Feed, calendar (📅) for Due Dates, bar chart (📊) for Analytics.</p>
      </Section>

      <Section title="Tips">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>Keyboard shortcuts are disabled while a modal is open or when focus is in a text input — so typing <strong>N</strong> in a card title field won't accidentally create a new card.</p>
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

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Reset to first tab when reopened
  useEffect(() => {
    if (isOpen) setActiveTab('getting-started');
  }, [isOpen]);

  if (typeof window === 'undefined') return null;

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
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Help Guide</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Everything you need to know about Kan-do</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body: tabs + content */}
            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar tabs */}
              <nav className="w-44 shrink-0 border-r border-gray-200 dark:border-gray-700 overflow-y-auto py-2">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left ${
                      activeTab === tab.id
                        ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium border-r-2 border-purple-600'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    <span className="text-base leading-none">{tab.icon}</span>
                    <span className="leading-tight">{tab.label}</span>
                  </button>
                ))}
              </nav>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.12 }}
                  >
                    {TAB_CONTENT[activeTab]}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 shrink-0 flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Press <Kbd>Esc</Kbd> to close
              </p>
              <div className="flex gap-1">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      activeTab === t.id ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    aria-label={`Go to ${t.label}`}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
