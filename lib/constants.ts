export const MAX_COLUMNS = 10;
export const MAX_HISTORY = 50;
export const DEBOUNCE_DELAY = 300;

export const PRIORITY_COLORS = {
  low: "#10b981", // Green
  medium: "#f59e0b", // Amber
  high: "#ef4444", // Red
} as const;

export const PRIORITY_LABELS = {
  low: "Low",
  medium: "Medium",
  high: "High",
} as const;

export const DEFAULT_BOARD_ID = "default-board";
export const DEFAULT_BOARD_NAME = "My Kanban Board";

export const DEFAULT_COLUMNS = [
  { title: "TODO", order: 0 },
  { title: "In Progress", order: 1 },
  { title: "Completed", order: 2 },
] as const;

export const CARD_COLORS = [
  "#ffffff", // White/Default
  "#fecaca", // Red 200
  "#fcd34d", // Amber 200
  "#86efac", // Green 200
  "#a7f3d0", // Emerald 200
  "#93c5fd", // Blue 200
  "#c4b5fd", // Violet 200
  "#f0abfc", // Fuchsia 200
  "#fed7aa", // Orange 200
] as const;

export const CARD_COLOR_NAMES = [
  "Default",
  "Red",
  "Amber",
  "Green",
  "Emerald",
  "Blue",
  "Violet",
  "Fuchsia",
  "Orange",
] as const;

export const DEMO_CARDS = [
  {
    title: "Design kanban board layout",
    description: "Create mockups and wireframes for the kanban UI",
    priority: "high",
    tags: ["design", "ui"],
    columnOrder: 0, // TODO
  },
  {
    title: "Implement drag and drop",
    description: "Use @dnd-kit to make cards draggable between columns",
    priority: "high",
    tags: ["feature", "react"],
    columnOrder: 1, // In Progress
    checklist: [
      { text: "Set up DndContext", completed: true },
      { text: "Make cards draggable", completed: true },
      { text: "Handle drop logic", completed: false },
      { text: "Add animations", completed: false },
    ],
  },
  {
    title: "Add dark mode support",
    description: "Implement theme toggle with Tailwind dark mode",
    priority: "medium",
    tags: ["feature", "ui"],
    columnOrder: 0, // TODO
  },
  {
    title: "Create rich text editor",
    description: "Integrate Tiptap for card notes with formatting",
    priority: "medium",
    tags: ["feature", "editor"],
    columnOrder: 1, // In Progress
  },
  {
    title: "Set up state management",
    description: "Create Zustand store with localStorage persistence",
    priority: "high",
    tags: ["infrastructure", "state"],
    columnOrder: 2, // Completed
    checklist: [
      { text: "Create store", completed: true },
      { text: "Add persistence middleware", completed: true },
      { text: "Add undo/redo", completed: true },
    ],
  },
  {
    title: "Implement search and filter",
    description: "Add ability to search and filter cards by priority, tags, due date",
    priority: "low",
    tags: ["feature", "search"],
    columnOrder: 0, // TODO
  },
  {
    title: "Add demo mode",
    description: "Create sample cards that demonstrate all features",
    priority: "low",
    tags: ["feature", "docs"],
    columnOrder: 2, // Completed
  },
  {
    title: "Export/Import boards",
    description: "Allow users to download and upload board data as JSON",
    priority: "medium",
    tags: ["feature", "data"],
    columnOrder: 0, // TODO
  },
] as const;
