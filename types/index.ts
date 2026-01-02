export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  order: number;
}

export interface Card {
  id: string;
  title: string;
  description?: string;
  notes?: string; // Rich text HTML from Tiptap
  columnId: string;
  boardId: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  priority?: "low" | "medium" | "high";
  tags?: string[];
  color?: string; // Hex color code
  dueDate?: string; // ISO date string
  checklist?: ChecklistItem[];
  aiPrompt?: string; // Generated AI implementation prompt
  status?: "active" | "descoped"; // Card status - defaults to 'active'
}

export interface Column {
  id: string;
  title: string;
  order: number;
  boardId: string;
  cards: Card[];
}

export interface Board {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  columns: Column[];
}

export interface KanbanState {
  boards: Board[];
  activeBoard: string | null;
  defaultBoardId: string | null;
  demoMode: boolean;
  darkMode: boolean;
  searchQuery: string;
  filters: {
    priorities?: ("low" | "medium" | "high")[];
    tags?: string[];
    dueDateRange?: [string, string]; // [start, end] ISO dates
    showOverdue?: boolean;
  };
  // Internal state for demo mode - stored boards before entering demo
  _userBoardsBackup?: Board[];
  // Due dates panel state
  dueDatePanelOpen: boolean;
  dueDatePanelWidth: number;
  // Unsaved changes tracking
  hasUnsavedChanges: boolean;
}

export interface KanbanActions {
  // Board actions
  addBoard: (name: string) => void;
  deleteBoard: (boardId: string) => void;
  updateBoard: (boardId: string, name: string) => void;
  switchBoard: (boardId: string) => void;
  setDefaultBoard: (boardId: string | null) => void;
  exportBoards: (boardId?: string) => string; // JSON string
  importBoards: (jsonData: string) => void;

  // Column actions
  addColumn: (boardId: string, title: string) => void;
  deleteColumn: (boardId: string, columnId: string) => void;
  updateColumn: (boardId: string, columnId: string, title: string) => void;
  reorderColumns: (boardId: string, columnIds: string[]) => void;

  // Card actions
  addCard: (
    boardId: string,
    columnId: string,
    cardData: Omit<Card, "id" | "boardId" | "columnId" | "order" | "createdAt" | "updatedAt">
  ) => void;
  deleteCard: (boardId: string, cardId: string) => void;
  updateCard: (boardId: string, cardId: string, cardData: Partial<Card>) => void;
  moveCard: (
    boardId: string,
    cardId: string,
    fromColumnId: string,
    toColumnId: string,
    newOrder: number
  ) => void;
  reorderCards: (boardId: string, columnId: string, cardIds: string[]) => void;

  // Checklist actions
  addChecklistItem: (boardId: string, cardId: string, text: string) => void;
  deleteChecklistItem: (boardId: string, cardId: string, itemId: string) => void;
  toggleChecklistItem: (boardId: string, cardId: string, itemId: string) => void;

  // UI state actions
  toggleDarkMode: () => void;
  toggleDemoMode: () => void;
  setDemoMode: (enabled: boolean) => void;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: KanbanState["filters"]) => void;
  clearFilters: () => void;

  // Due dates panel actions
  toggleDueDatePanel: () => void;
  setDueDatePanelOpen: (isOpen: boolean) => void;
  setDueDatePanelWidth: (width: number) => void;

  // History actions
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;

  // Firebase sync actions
  setBoards: (boards: Board[]) => void;
  updateBoardFromFirebase: (boardId: string, updatedBoard: Board) => void;
  loadAllBoardsFromLocalStorage: () => Board[];

  // Manual save actions
  markAsUnsaved: () => void;
  markAsSaved: () => void;
  saveToFirebase: () => Promise<void>;
}

export type KanbanStore = KanbanState & KanbanActions;

export interface DemoConfig {
  id: string;
  board: Board;
  updatedAt: string;
  updatedBy: string;
}
