export const MAX_COLUMNS = 10;
export const MAX_HISTORY = 50;
export const DEBOUNCE_DELAY = 300;

export const COMPLETED_COLUMN_KEYWORDS = [
  "completed",
  "done",
  "finished",
  "closed",
  "delivered",
] as const;

export const DESCOPED_COLUMN_KEYWORDS = [
  "descoped",
  "descope",
  "out of scope",
  "backlog",
] as const;

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
  { title: "Descoped", order: 3 },
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
      { id: "cl1", text: "Set up DndContext", completed: true },
      { id: "cl2", text: "Make cards draggable", completed: true },
      { id: "cl3", text: "Handle drop logic", completed: false },
      { id: "cl4", text: "Add animations", completed: false },
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
      { id: "cl5", text: "Create store", completed: true },
      { id: "cl6", text: "Add persistence middleware", completed: true },
      { id: "cl7", text: "Add undo/redo", completed: true },
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

// Production data backup - User's complete board data from production
// Can be recovered using the recoverFromBackup function if data is lost
export const PRODUCTION_BACKUP_DATA = {
  state: {
    boards: [
      {
        id: "default-board",
        name: "My Kanban Board",
        createdAt: "2025-12-19T04:55:14.079Z",
        updatedAt: "2025-12-19T04:55:14.080Z",
        columns: [
          {
            id: "LN4ejO1Ywt_EUkBEUgpQN",
            title: "TODO",
            order: 0,
            boardId: "default-board",
            cards: [
              {
                title: "Develop Security Features",
                id: "PB7NlPvt2erxaB5NprxYE",
                boardId: "default-board",
                columnId: "LN4ejO1Ywt_EUkBEUgpQN",
                order: 0,
                createdAt: "2025-12-19T05:05:49.956Z",
                updatedAt: "2025-12-19T14:27:52.434Z",
                description: "Include security features to protect this web app from all vulnerabilies",
                notes: "<p>security features should protect against all vulnerabilities and malware</p>",
                priority: "high",
                dueDate: "2025-12-26",
                tags: [],
                checklist: [],
              },
              {
                title: "Database for this Kanban app",
                id: "J1B0LpSrZouEMLlBQC83D",
                boardId: "default-board",
                columnId: "LN4ejO1Ywt_EUkBEUgpQN",
                order: 1,
                createdAt: "2025-12-22T18:11:01.523Z",
                updatedAt: "2025-12-22T19:20:58.825Z",
                description: "A free, secure and performant online database",
                notes: "<p>I want to consider Firebase as I know it's free. Right now, this will be for me and my partner for use and testing. We might eventually consider this as product offering at scale later. </p>",
                priority: "high",
                dueDate: "2025-12-24",
                tags: [],
                checklist: [],
              },
            ],
          },
          {
            id: "R2AwDK-RnEtY2e4_Flo0h",
            title: "In Progress",
            order: 1,
            boardId: "default-board",
            cards: [],
          },
          {
            id: "C-fIishNbo0fup4pksNNQ",
            title: "Completed",
            order: 2,
            boardId: "default-board",
            cards: [
              {
                title: "Due Dates panel testing",
                id: "UGyUCduCnYAooGqthMei7",
                boardId: "default-board",
                columnId: "C-fIishNbo0fup4pksNNQ",
                order: 0,
                createdAt: "2025-12-19T14:11:00.693Z",
                updatedAt: "2025-12-19T14:11:12.605Z",
                description: "",
                notes: "",
                dueDate: "2025-12-26",
                tags: [],
                checklist: [],
              },
              {
                title: "Summarize Kanban due dates",
                id: "DN38muYenrGR0_htSs_5k",
                boardId: "default-board",
                columnId: "C-fIishNbo0fup4pksNNQ",
                order: 1,
                createdAt: "2025-12-19T12:38:09.433Z",
                updatedAt: "2025-12-19T13:26:12.907Z",
                description: "Create Outlook styled view of cards by column category in the right hand panel",
                notes: "<p>The card events should be summarized in descending order calendar date with. Exclude any column that indicates \"Completed\" or \"Done\", basically any column that indicates its cards have been delivered</p>",
                dueDate: "2025-12-30",
                tags: [],
                checklist: [],
              },
            ],
          },
          {
            id: "EkjJz1qJWKhcB7LBXwzJp",
            title: "Descoped",
            order: 3,
            boardId: "default-board",
            cards: [
              {
                title: "Add AI LLM Capabilities for this Kanban app",
                id: "1OeSfjWrxeww3yT4PrEFl",
                boardId: "default-board",
                columnId: "EkjJz1qJWKhcB7LBXwzJp",
                order: 0,
                createdAt: "2025-12-19T05:11:50.885Z",
                updatedAt: "2025-12-19T17:50:44.556Z",
                description: "Add a prompt window for self-serve prompts for this application",
                notes: "<p>This feature should have a prompt box above the Due Dates column. Provide guidance on this feature and whether it could add value. Also advise whether i can use my existing Claude API for feature testing between me and 1 friend and the potential impact in terms of token costs</p>",
                priority: "low",
                dueDate: "2025-12-23",
                tags: [],
                checklist: [],
                status: "descoped",
              },
              {
                title: "Kanban Card Feature Enhancement 1",
                id: "mmhMo4J_YZTTvdH7gONer",
                boardId: "default-board",
                columnId: "EkjJz1qJWKhcB7LBXwzJp",
                order: 1,
                createdAt: "2025-12-19T20:03:32.516Z",
                updatedAt: "2025-12-19T20:14:33.427Z",
                description: "Check box on card face",
                notes: "<p>Quality of life improvement: add a check box on the card's face to represent it's complete. The card if checked off should be moved to the \"Completed\" or done column. </p><p></p>",
                dueDate: "2025-12-22",
                tags: [],
                checklist: [],
                status: "descoped",
              },
            ],
          },
        ],
      },
      {
        id: "WtQ40xaAPiSshE31_-dRu",
        name: "Julian",
        createdAt: "2025-12-19T16:52:29.855Z",
        updatedAt: "2025-12-19T16:52:29.855Z",
        columns: [
          {
            id: "OxT-2TXaf6CnSUCO6J1my",
            title: "TODO",
            order: 0,
            boardId: "WtQ40xaAPiSshE31_-dRu",
            cards: [
              {
                title: "Plan BSU BHM Events",
                id: "M-2lwHEHQsU_WR3z57kdv",
                boardId: "WtQ40xaAPiSshE31_-dRu",
                columnId: "OxT-2TXaf6CnSUCO6J1my",
                order: 0,
                createdAt: "2025-12-19T16:52:58.283Z",
                updatedAt: "2025-12-19T17:05:45.160Z",
                checklist: [
                  {
                    id: "zParbGow5j9c1Y1jZFaPz",
                    text: "Karaoke Night",
                    completed: false,
                    order: 0,
                  },
                  {
                    id: "Zn7MjaEOeDsyD6NBzjprl",
                    text: "Spirit days inspired by Black Culture",
                    completed: false,
                    order: 1,
                  },
                  {
                    id: "u9eraI2Td58RHSYgJ1wBD",
                    text: "Fashion Show",
                    completed: false,
                    order: 2,
                  },
                  {
                    id: "g8CM9XnsDqKN7Y1M3dYcd",
                    text: "Daily Black hero highlight",
                    completed: false,
                    order: 3,
                  },
                  {
                    id: "KvKhEiPs07hhhX9gT1uoe",
                    text: "Open mic",
                    completed: false,
                    order: 4,
                  },
                  {
                    id: "hei0cex1APsCyHT9n9F2t",
                    text: "game night",
                    completed: false,
                    order: 5,
                  },
                  {
                    id: "3Pi29eTvYe9tBfIzvXUtJ",
                    text: "women's health forum",
                    completed: false,
                    order: 6,
                  },
                ],
                description: "2026 Black History Month Planning",
                notes: "<p>Using plan mode, help me create plan for the entire month including Spirit days for each week, HBCU/black panther style fashion show,</p>",
                priority: "high",
                dueDate: "2026-02-28",
                tags: [],
              },
            ],
          },
          {
            id: "f9ZP4hmmdHl40SpyPs9F4",
            title: "In Progress",
            order: 1,
            boardId: "WtQ40xaAPiSshE31_-dRu",
            cards: [],
          },
          {
            id: "tAgKXJeI0q83xvk6K1857",
            title: "Completed",
            order: 2,
            boardId: "WtQ40xaAPiSshE31_-dRu",
            cards: [],
          },
        ],
      },
      {
        id: "lR1dLqzyOIA7ONoNE_I94",
        name: "Testing Descoped Context",
        createdAt: "2025-12-19T21:18:24.251Z",
        updatedAt: "2025-12-19T21:18:24.251Z",
        columns: [
          {
            id: "u9L_H6XGR_4BZfaDd2Uu8",
            title: "TODO",
            order: 0,
            boardId: "lR1dLqzyOIA7ONoNE_I94",
            cards: [],
          },
          {
            id: "HEsJFEBG78vYwzzUqjKSR",
            title: "In Progress",
            order: 1,
            boardId: "lR1dLqzyOIA7ONoNE_I94",
            cards: [],
          },
          {
            id: "CAvJFMti13nsskTt5Xc8M",
            title: "Completed",
            order: 2,
            boardId: "lR1dLqzyOIA7ONoNE_I94",
            cards: [],
          },
          {
            id: "XdEf1G4FclhIBOli81Ili",
            title: "Descoped",
            order: 3,
            boardId: "lR1dLqzyOIA7ONoNE_I94",
            cards: [
              {
                title: "Deprecate this Tab",
                id: "J860nFuk0T2kL9pzbGaps",
                boardId: "lR1dLqzyOIA7ONoNE_I94",
                columnId: "XdEf1G4FclhIBOli81Ili",
                order: 0,
                createdAt: "2025-12-19T21:19:04.296Z",
                updatedAt: "2025-12-20T00:34:41.414Z",
                description: "",
                notes: "",
                dueDate: "2025-12-26",
                tags: [],
                checklist: [],
                priority: "high",
                status: "descoped",
              },
            ],
          },
        ],
      },
      {
        id: "9PJxdT_J3YMYGWFb6R2fl",
        name: "Default Columns Test",
        createdAt: "2025-12-22T18:04:41.290Z",
        updatedAt: "2025-12-22T18:04:41.290Z",
        columns: [
          {
            id: "qOWanc44IG5GP9I83bsJw",
            title: "TODO",
            order: 0,
            boardId: "9PJxdT_J3YMYGWFb6R2fl",
            cards: [],
          },
          {
            id: "M7ccPBktw7nvkuWCrBIiY",
            title: "In Progress",
            order: 1,
            boardId: "9PJxdT_J3YMYGWFb6R2fl",
            cards: [],
          },
          {
            id: "fxgXRY3UhcihQ2woYy_dM",
            title: "Completed",
            order: 2,
            boardId: "9PJxdT_J3YMYGWFb6R2fl",
            cards: [],
          },
          {
            id: "6Cl-AlrDQovyw2skWXPqa",
            title: "Descoped",
            order: 3,
            boardId: "9PJxdT_J3YMYGWFb6R2fl",
            cards: [],
          },
        ],
      },
    ],
    activeBoard: "default-board",
    demoMode: false,
    darkMode: false,
    searchQuery: "",
    filters: {},
    dueDatePanelOpen: true,
    dueDatePanelWidth: 320,
  },
} as const;
