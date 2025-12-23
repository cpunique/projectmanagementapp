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
                aiPrompt: "# Security Features Implementation Guide\n\n## Overview\nWe need to build comprehensive security protections for the web application to defend against common vulnerabilities and malicious attacks. This will involve multiple layers of security controls.\n\n## Implementation Steps\n\n### 1. Input Validation & Sanitization\n**What to build:** Clean and validate all user inputs\n- Add validation rules for all form fields (length, format, allowed characters)\n- Sanitize user input before displaying it anywhere on the site\n- Block or escape special characters that could be used maliciously\n- Validate file uploads (type, size, content)\n\n### 2. Authentication & Authorization\n**What to build:** Secure user login and access controls\n- Implement strong password requirements (length, complexity)\n- Add account lockout after failed login attempts\n- Set up session timeouts for inactive users\n- Create role-based permissions (admin, user, guest)\n- Add two-factor authentication option\n\n### 3. Data Protection\n**What to build:** Encrypt sensitive information\n- Hash all passwords using strong algorithms (bcrypt/Argon2)\n- Encrypt sensitive data in the database\n- Use HTTPS for all pages and API calls\n- Secure API keys and database credentials in environment variables\n\n### 4. Request Security\n**What to build:** Protect against malicious requests\n- Add CSRF tokens to all forms\n- Implement rate limiting to prevent spam/brute force attacks\n- Validate and sanitize all API endpoints\n- Add request size limits to prevent oversized uploads\n\n### 5. Headers & Configuration\n**What to build:** Secure HTTP headers and server settings\n- Add security headers (Content Security Policy, X-Frame-Options, etc.)\n- Hide server version information\n- Disable unnecessary features and endpoints\n- Set secure cookie flags\n\n### 6. Monitoring & Logging\n**What to build:** Track security events\n- Log all login attempts, failed authentications, and suspicious activity\n- Set up alerts for potential security incidents\n- Monitor for unusual traffic patterns\n- Keep audit trails of sensitive actions\n\n### 7. Regular Updates\n**What to build:** Maintenance processes\n- Create a system to regularly update dependencies\n- Schedule security scans and vulnerability assessments\n- Plan for security patch deployment\n\n## Why This Matters\nEach layer catches different types of attacks - input validation stops injection attacks, authentication prevents unauthorized access, encryption protects data, and monitoring helps catch problems early.\n\n## Testing\n- Test each security feature with both valid and malicious inputs\n- Use security scanning tools to check for missed vulnerabilities\n- Have someone attempt to break the security measures\n\nThis multi-layered approach will protect against the most common web application vulnerabilities and provide a strong security foundation.",
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
                aiPrompt: "# Database Implementation for Kanban App\n\n## Overview\nSet up Firebase as your database solution to store and sync Kanban board data between you and your partner. Firebase is perfect for your current needs and can scale if you decide to turn this into a product later.\n\n## What you're building\nA cloud database that will store your boards, lists, and cards with real-time synchronization between users.\n\n## Implementation Steps\n\n### 1. Set up Firebase project\n- Go to [Firebase Console](https://console.firebase.google.com)\n- Click \"Create a project\" and follow the setup wizard\n- Enable Google Analytics (recommended for future insights)\n- Note down your project configuration details\n\n### 2. Choose your Firebase services\nFor a Kanban app, you'll need:\n- **Firestore Database** (for storing board data)\n- **Authentication** (to identify you and your partner)\n- **Hosting** (optional, for deploying your app)\n\n### 3. Install Firebase in your app\n```bash\nnpm install firebase\n```\n\n### 4. Configure Firebase connection\n- Create a `firebase-config.js` file with your project credentials\n- Initialize Firebase and Firestore in your app\n- Set up the connection in your main app file\n\n### 5. Design your data structure\nOrganize your Kanban data like this:\n```\nboards/\n  └── boardId/\n      ├── title: \"My Project\"\n      ├── createdAt: timestamp\n      └── lists/\n          └── listId/\n              ├── title: \"To Do\"\n              ├── position: 0\n              └── cards/\n                  └── cardId/\n                      ├── title: \"Task name\"\n                      ├── description: \"Details\"\n                      └── position: 0\n```\n\n### 6. Set up Authentication\n- Enable Email/Password authentication in Firebase Console\n- Create sign-up/login forms in your app\n- Add authentication checks to protect your boards\n\n### 7. Implement database operations\nCreate functions to:\n- **Create** new boards, lists, and cards\n- **Read** existing data when the app loads\n- **Update** items when they're edited or moved\n- **Delete** items when removed\n\n### 8. Add real-time sync\n- Use Firestore's real-time listeners\n- Update your UI automatically when data changes\n- This lets you and your partner see changes instantly\n\n### 9. Set up security rules\nConfigure Firestore rules so:\n- Only authenticated users can access data\n- Users can only see boards they have permission for\n- Prevent unauthorized changes\n\n### 10. Test everything\n- Create test boards with sample data\n- Try editing from different devices/browsers\n- Verify real-time updates work properly\n- Test offline functionality\n\n## Why this approach works\n- **Free tier** covers your current needs generously\n- **Real-time sync** keeps you and your partner in sync\n- **Scales automatically** if you go commercial later\n- **Secure** with built-in authentication and rules\n- **Fast setup** compared to building your own backend\n\n## Next steps after basic setup\n- Add user permissions for sharing boards\n- Implement offline support for better UX\n- Consider Firebase Functions for complex operations\n- Monitor usage in Firebase Console\n\nThis setup will give you a robust, professional database solution that grows with your needs!",
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
                aiPrompt: "# Implementation Instructions: Due Dates Summary Panel\n\n## Overview\nBuild a right-hand sidebar panel that displays an Outlook-style calendar view of cards, organized by their column categories and sorted by due dates.\n\n## What You're Building\nA summary panel that helps users quickly see upcoming deadlines across all their active work, similar to Outlook's calendar agenda view.\n\n## Step-by-Step Implementation\n\n### 1. Create the Right Panel Layout\n- Add a collapsible sidebar to the right side of the main board view\n- Make it resizable (users can drag to adjust width)\n- Include a header with the title \"Upcoming Due Dates\"\n- Add a toggle button to show/hide the panel\n\n### 2. Filter Cards by Status\n- Exclude cards from columns containing these keywords (case-insensitive):\n  - \"Completed\"\n  - \"Done\" \n  - \"Finished\"\n  - \"Closed\"\n  - \"Delivered\"\n- Only include cards that have due dates assigned\n- Pull from all remaining active columns\n\n### 3. Organize and Sort the Data\n- Group cards by their column category (e.g., \"To Do\", \"In Progress\", \"Review\")\n- Within each column group, sort cards by due date (nearest dates first)\n- Show overdue items at the very top with visual emphasis\n\n### 4. Design the Display Format\n**For each column section:**\n- Column name as a header (with card count)\n- List cards underneath with:\n  - Card title (clickable to open card)\n  - Due date (formatted like \"Mon, Dec 18\" or \"Today\"/\"Tomorrow\" for near dates)\n  - Small priority indicator if applicable\n  - Overdue cards should have red text/background\n\n### 5. Add Interactive Features\n- Clicking a card opens it in the main view\n- Hover effects for better usability\n- Consider adding a \"Mark Complete\" quick action button\n- Auto-refresh when cards are moved or updated\n\n### 6. Handle Edge Cases\n- Show \"No upcoming due dates\" message when list is empty\n- Handle cards without due dates gracefully\n- Account for different date formats and time zones\n\n## Technical Considerations\n- This panel should update in real-time when the board changes\n- Consider performance with large numbers of cards\n- Make it mobile-friendly (perhaps collapsible on smaller screens)\n\n## Success Criteria\nUsers should be able to quickly scan their upcoming deadlines without having to scroll through the entire board, helping them prioritize their work more effectively.",
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
                aiPrompt: "# AI LLM Integration for Kanban App - Implementation Guide\n\n## Feature Overview\nAdding an AI prompt box above the Due Dates column will let users get instant help with project management tasks, task suggestions, and workflow optimization. This is a valuable addition that can boost productivity and user engagement.\n\n## Value Assessment ✅\n**High value feature** - Users love AI assistance for:\n- Breaking down complex tasks into smaller ones\n- Generating task descriptions\n- Suggesting priorities and deadlines\n- Getting workflow advice\n- Quick brainstorming for project ideas\n\n## Implementation Steps\n\n### 1. UI Components\n- **Add prompt input box** above the Due Dates column header\n- Include a \"Ask AI\" button or Enter key submission\n- Add a collapsible response area below the input\n- Show loading spinner during API calls\n- Add a small \"Powered by Claude\" badge\n\n### 2. Core Functionality\n- Capture user prompts from the input field\n- Send requests to Claude API with relevant context\n- Display AI responses in a clean, readable format\n- Allow users to dismiss/clear responses\n- Add basic error handling for failed requests\n\n### 3. Context Integration\n**Make the AI aware of current board state:**\n- Include column names and task counts in API calls\n- Send over current tasks (titles only for privacy)\n- Add board name/project context\n- This makes responses much more relevant and useful\n\n### 4. API Implementation\n- Set up secure API key storage (environment variables)\n- Create endpoint to handle Claude API calls\n- Add request rate limiting (important for cost control)\n- Implement basic prompt sanitization\n\n## Claude API Usage for Testing\n\n### Cost Estimate 💰\n**Very manageable for testing with 2 users:**\n- Claude API: ~$0.01-0.05 per interaction\n- Expected usage: 10-20 prompts/day between you two\n- **Monthly cost: $3-15** (well within testing budget)\n\n### Rate Limiting Recommendation\n- Limit to 10 prompts per user per hour\n- This prevents accidental cost spikes while allowing proper testing\n\n## Quick Start Implementation\n\n### Phase 1: Basic Setup (2-3 hours)\n1. Add UI components to kanban board\n2. Create simple prompt submission form\n3. Set up Claude API connection\n4. Test with basic prompts\n\n### Phase 2: Enhanced Features (3-4 hours)\n1. Add board context to API calls\n2. Improve response formatting\n3. Add error handling and loading states\n4. Implement usage tracking\n\n## Sample Prompts to Test\n- \"Help me prioritize these tasks\"\n- \"Break down [task name] into smaller steps\"\n- \"What's missing from this project?\"\n- \"Suggest a realistic timeline for completion\"\n\n## Technical Notes\n- Store API keys securely (never in frontend code)\n- Consider caching common responses to reduce costs\n- Add a character limit on prompts (500-1000 chars)\n- Log usage for monitoring costs during testing\n\nThis feature will definitely add value and your Claude API is perfect for testing. The costs will be minimal with just two users, and you can always add stricter limits if needed.",
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
                aiPrompt: "# Kanban Card Checkbox Feature\n\n## What we're building\nAdd a simple checkbox to each Kanban card that users can click to mark tasks as complete. When checked, the card should automatically move to the \"Done\" or \"Completed\" column.\n\n## Why this helps\nThis gives users a quick way to mark tasks complete without having to drag cards around, making the workflow faster and more intuitive.\n\n## Implementation Steps\n\n### 1. Update the Card UI\n- Add a checkbox element to the front face of each Kanban card\n- Position it in a consistent spot (suggest top-right or bottom-right corner)\n- Style it to be clearly visible but not overwhelming\n- Make sure it doesn't interfere with existing card interactions (dragging, editing)\n\n### 2. Handle Checkbox Interactions\n- When a user clicks the checkbox:\n  - Immediately check the box (visual feedback)\n  - Trigger the card movement to the completed column\n  - Update the card's status in your data storage\n\n### 3. Automatic Card Movement\n- Identify your \"Done/Completed\" column (create one if it doesn't exist)\n- Move the checked card to this column automatically\n- Ensure the card appears at the top or bottom of the completed column (pick one for consistency)\n- Show a smooth transition/animation if possible\n\n### 4. Handle Edge Cases\n- If a card is already in the completed column, the checkbox should appear pre-checked\n- Consider whether unchecking should move the card back to a previous column (or just uncheck without moving)\n- Make sure the checkbox state persists when the page refreshes\n\n### 5. Optional Enhancements\n- Add a subtle visual change to completed cards (slightly faded, different background)\n- Consider adding a confirmation dialog for unchecking completed items\n- Show a brief success message when cards are marked complete\n\n## Testing Checklist\n- [ ] Checkbox appears on all cards\n- [ ] Clicking checkbox moves card to completed column\n- [ ] Checkbox state saves properly\n- [ ] Doesn't break existing drag-and-drop functionality\n- [ ] Works consistently across different browsers",
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
                aiPrompt: "# BSU Black History Month 2026 Event Planning Implementation\n\n## Overview\nCreate a comprehensive month-long celebration featuring weekly spirit themes, showcase events, and daily educational content to honor Black history and culture.\n\n## Implementation Steps\n\n### 1. Weekly Spirit Day Themes\n**Week 1:** \"Roots & Heritage\" \n- Monday: African Print Day\n- Tuesday: HBCU Colors Day\n- Wednesday: Natural Hair Celebration\n- Thursday: Black-Owned Business Support Day\n- Friday: Ancestral Pride Day\n\n**Week 2:** \"Culture & Expression\"\n- Monday: Music Legends Day (dress as favorite Black artist)\n- Tuesday: Literary Icons Day\n- Wednesday: Art & Creativity Day\n- Thursday: Dance Culture Day\n- Friday: Film & TV Heroes Day\n\n**Week 3:** \"Excellence & Achievement\"\n- Monday: STEM Pioneers Day\n- Tuesday: Sports Legends Day\n- Wednesday: Business Leaders Day\n- Thursday: Political Trailblazers Day\n- Friday: Community Champions Day\n\n**Week 4:** \"Future Forward\"\n- Monday: Young Innovators Day\n- Tuesday: Social Justice Warriors Day\n- Wednesday: Creative Entrepreneurs Day\n- Thursday: Global Black Culture Day\n\n### 2. Major Events Schedule\n\n**Fashion Show:** \"Wakanda Meets Howard\" (Week 2)\n- HBCU-inspired collegiate wear segment\n- Black Panther/Afrofuturism segment\n- Contemporary Black designers segment\n- Student showcase segment\n\n**Karaoke Night:** \"Soulful Sounds\" (Week 1)\n- Focus on Black musical artists across genres\n- Provide song lists spanning different eras\n\n**Open Mic:** \"Voices Rising\" (Week 3)\n- Poetry, spoken word, music, storytelling\n- Include historical piece performances\n\n**Game Night:** \"Culture Connect\" (Week 4)\n- Trivia focused on Black history and culture\n- Traditional games from African diaspora\n- Modern games with cultural themes\n\n**Women's Health Forum:** \"Sisters in Wellness\" (Week 2)\n- Address health disparities in Black communities\n- Feature Black healthcare professionals\n- Include mental health resources\n\n### 3. Daily Hero Highlights\n**Implementation:**\n- Create daily social media posts featuring different Black historical figures\n- Include lesser-known heroes alongside famous ones\n- Mix historical and contemporary figures\n- Provide brief, engaging facts and achievements\n- Use consistent visual branding\n\n### 4. Logistics & Resources Needed\n\n**Marketing:**\n- Create unified visual theme using Pan-African colors\n- Design daily social media templates\n- Develop promotional materials for each event\n\n**Coordination:**\n- Assign event leads for each major event\n- Create volunteer signup system\n- Establish partnerships with other campus organizations\n\n**Materials:**\n- Fashion show: runway setup, lighting, sound system\n- Karaoke: equipment rental, song licensing\n- Game night: trivia questions, game supplies\n- Health forum: venue, speaker coordination\n\n### 5. Success Metrics\n- Track attendance at each event\n- Monitor social media engagement on daily highlights\n- Collect participant feedback\n- Document participation in spirit days\n\n## Timeline\n- **3 months prior:** Secure venues, book speakers, begin promotion\n- **2 months prior:** Finalize event details, recruit volunteers\n- **1 month prior:** Intensive marketing, confirm all logistics\n- **During February:** Execute daily highlights and weekly events\n\nThis plan creates an engaging, educational, and celebratory month that honors Black history while building community participation through varied, accessible activities.",
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
