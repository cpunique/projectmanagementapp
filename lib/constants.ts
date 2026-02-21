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

export const LABEL_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#6b7280', // Gray
] as const;

export const BOARD_BACKGROUNDS: { label: string; value: string | undefined }[] = [
  { label: 'Default', value: undefined },
  { label: 'Ocean', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { label: 'Sunset', value: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)' },
  { label: 'Sky', value: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)' },
  { label: 'Forest', value: 'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)' },
  { label: 'Rose', value: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)' },
  { label: 'Navy', value: '#1e3a5f' },
  { label: 'Dark', value: '#1a1a2e' },
  { label: 'Teal', value: '#134e4a' },
];

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
  // --- TODO (columnOrder: 0) ---
  {
    title: "Plan social media launch campaign",
    description: "Define channels, content calendar, and paid ad budget for launch week",
    priority: "high",
    tags: ["marketing", "social"],
    columnOrder: 0,
  },
  {
    title: "Redesign pricing page",
    description: "A/B test headline copy and update plan tiers based on beta feedback",
    priority: "high",
    tags: ["design", "website"],
    columnOrder: 0,
  },
  {
    title: "Set up customer support workflow",
    description: "Configure help desk, canned responses, and escalation paths before launch",
    priority: "medium",
    tags: ["operations", "support"],
    columnOrder: 0,
  },
  {
    title: "Write onboarding email sequence",
    description: "5-email drip campaign for new sign-ups covering key features",
    priority: "medium",
    tags: ["marketing", "email"],
    columnOrder: 0,
  },

  // --- In Progress (columnOrder: 1) ---
  {
    title: "App Store & Play Store submission",
    description: "Prepare screenshots, descriptions, and metadata for both stores",
    priority: "high",
    tags: ["product", "mobile"],
    columnOrder: 1,
    checklist: [
      { id: "cl1", text: "Capture app screenshots (all screen sizes)", completed: true },
      { id: "cl2", text: "Write store description & keywords", completed: true },
      { id: "cl3", text: "Submit to App Store review", completed: false },
      { id: "cl4", text: "Submit to Google Play review", completed: false },
    ],
  },
  {
    title: "Press kit & media outreach",
    description: "Compile press kit with logos, screenshots, founder bios, and story angles",
    priority: "high",
    tags: ["marketing", "pr"],
    columnOrder: 1,
    checklist: [
      { id: "cl5", text: "Write press release", completed: true },
      { id: "cl6", text: "Build media contact list", completed: true },
      { id: "cl7", text: "Send outreach emails", completed: false },
    ],
  },
  {
    title: "Integrate analytics & event tracking",
    description: "Instrument key user actions to measure activation, retention, and drop-off",
    priority: "medium",
    tags: ["product", "analytics"],
    columnOrder: 1,
  },

  // --- Completed (columnOrder: 2) ---
  {
    title: "Finalize v1.0 feature set",
    description: "Lock scope, cut lower-priority items, communicate decisions to team",
    priority: "high",
    tags: ["product", "planning"],
    columnOrder: 2,
    checklist: [
      { id: "cl8", text: "Review open feature requests", completed: true },
      { id: "cl9", text: "Confirm scope with stakeholders", completed: true },
      { id: "cl10", text: "Update roadmap doc", completed: true },
    ],
  },
  {
    title: "Beta testing with 50 users",
    description: "Recruited beta cohort, collected feedback via surveys and interviews",
    priority: "high",
    tags: ["qa", "research"],
    columnOrder: 2,
  },
  {
    title: "Landing page design & copywriting",
    description: "Hero section, feature highlights, testimonials, and CTA designed and live",
    priority: "high",
    tags: ["design", "website"],
    columnOrder: 2,
  },
  {
    title: "Set up billing & subscription management",
    description: "Stripe integration for Pro plan — payments, upgrades, and cancellations working",
    priority: "medium",
    tags: ["product", "billing"],
    columnOrder: 2,
  },

  // --- Descoped (columnOrder: 3) ---
  {
    title: "Android app — Phase 2",
    description: "Deprioritized for launch; iOS first strategy agreed with team",
    priority: "low",
    tags: ["product", "mobile"],
    columnOrder: 3,
  },
  {
    title: "Affiliate / referral program",
    description: "Good long-term growth lever but too complex to ship before launch",
    priority: "low",
    tags: ["marketing", "growth"],
    columnOrder: 3,
  },
] as const;
