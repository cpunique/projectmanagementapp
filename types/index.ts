export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  order: number;
}

export interface MentionedUser {
  userId: string;
  email: string;
}

export interface CardComment {
  id: string;
  authorId: string;
  authorEmail: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  isEdited?: boolean;
  mentions?: MentionedUser[]; // Users mentioned with @
}

export interface Notification {
  id: string;
  type: 'mention';
  boardId: string;
  boardName: string;
  cardId: string;
  cardTitle: string;
  commentId: string;
  fromUserId: string;
  fromUserEmail: string;
  createdAt: string;
  read: boolean;
}

export interface BoardCollaborator {
  userId: string;
  email: string;
  role: 'viewer' | 'editor';
  addedAt: string;
  addedBy: string; // userId of person who added them
}

// Instruction types for AI prompt generation
export type InstructionType = 'development' | 'general' | 'event-planning' | 'documentation';

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
  comments?: CardComment[]; // Thread of comments on this card
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
  description?: string; // Optional board description for context
  purpose?: InstructionType; // Board's default AI instruction type
  createdAt: string;
  updatedAt: string;
  columns: Column[];
  ownerId: string; // User ID of the board creator
  ownerEmail?: string; // Email of the board creator (for @mentions)
  sharedWith?: BoardCollaborator[]; // Array of collaborators (empty if not shared)
  sharedWithUserIds?: string[]; // Denormalized array of user IDs for Firestore rule checks
  editorUserIds?: string[]; // Denormalized array of editor user IDs for Firestore permission checks
}

export type SyncState = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

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
  // Sync state tracking
  syncState: SyncState;
  lastSyncTime: string | null; // ISO timestamp
  pendingOperations: number; // Count of pending operations when offline
  isOnline: boolean; // Network connectivity status
  syncProgress?: { completed: number; total: number }; // Queue processing progress
  // Notifications
  notifications: Notification[];
}

export interface KanbanActions {
  // Board actions
  addBoard: (name: string, description?: string) => void;
  deleteBoard: (boardId: string) => void;
  updateBoard: (boardId: string, name: string) => void;
  updateBoardDescription: (boardId: string, description: string) => void;
  updateBoardPurpose: (boardId: string, purpose: InstructionType) => void;
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

  // Comment actions
  addComment: (boardId: string, cardId: string, authorId: string, authorEmail: string, content: string, mentions?: MentionedUser[]) => void;
  editComment: (boardId: string, cardId: string, commentId: string, content: string, mentions?: MentionedUser[]) => void;
  deleteComment: (boardId: string, cardId: string, commentId: string) => void;

  // Notification actions
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;

  // UI state actions
  toggleDarkMode: () => void;
  toggleDemoMode: () => void;
  setDemoMode: (enabled: boolean, customDemoBoard?: Board) => void;
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

  // Sync state actions
  setSyncState: (state: SyncState) => void;
  setLastSyncTime: (time: string | null) => void;
  setPendingOperations: (count: number) => void;
  setIsOnline: (isOnline: boolean) => void;
  incrementPendingOperations: () => void;
  decrementPendingOperations: () => void;
  setSyncProgress: (progress: { completed: number; total: number } | undefined) => void;
}

export type KanbanStore = KanbanState & KanbanActions;

export interface DemoConfig {
  id: string;
  board: Board;
  updatedAt: string;
  updatedBy: string;
}

// Tier and Subscription Types
export type UserTier = 'free' | 'pro' | 'enterprise';

export interface UserSubscription {
  tier: UserTier;
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}

export interface TierLimits {
  maxBoards: number;
  maxCollaboratorsPerBoard: number;
  maxStorageMB: number;
  features: {
    advancedAnalytics: boolean;
    customFields: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
  };
}

export interface UserProfile {
  uid: string;
  email: string;
  subscription: UserSubscription;
  createdAt: string;
  updatedAt: string;
}
