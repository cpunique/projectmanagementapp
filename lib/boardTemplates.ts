export interface BoardTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  columns: { title: string; order: number }[];
}

export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Board',
    description: 'Start with 3 basic columns',
    icon: '📋',
    columns: [
      { title: 'TODO', order: 0 },
      { title: 'In Progress', order: 1 },
      { title: 'Done', order: 2 },
    ],
  },
  {
    id: 'software-dev',
    name: 'Software Development',
    description: 'Backlog through deployment pipeline',
    icon: '💻',
    columns: [
      { title: 'Backlog', order: 0 },
      { title: 'Sprint', order: 1 },
      { title: 'In Review', order: 2 },
      { title: 'Testing', order: 3 },
      { title: 'Done', order: 4 },
      { title: 'Descoped', order: 5 },
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing Campaign',
    description: 'From ideas to launch',
    icon: '📢',
    columns: [
      { title: 'Ideas', order: 0 },
      { title: 'Planning', order: 1 },
      { title: 'In Production', order: 2 },
      { title: 'Review', order: 3 },
      { title: 'Launched', order: 4 },
    ],
  },
  {
    id: 'event-planning',
    name: 'Event Planning',
    description: 'Organize events step by step',
    icon: '🎉',
    columns: [
      { title: 'Ideas', order: 0 },
      { title: 'To Book', order: 1 },
      { title: 'Confirmed', order: 2 },
      { title: 'Day-Of Tasks', order: 3 },
      { title: 'Complete', order: 4 },
    ],
  },
  {
    id: 'personal',
    name: 'Personal Tasks',
    description: 'Simple personal productivity board',
    icon: '🏠',
    columns: [
      { title: 'To Do', order: 0 },
      { title: 'Doing', order: 1 },
      { title: 'Waiting On', order: 2 },
      { title: 'Done', order: 3 },
    ],
  },
  {
    id: 'bug-tracking',
    name: 'Bug Tracking',
    description: 'Triage, fix, and verify bugs',
    icon: '🐛',
    columns: [
      { title: 'Reported', order: 0 },
      { title: 'Triaged', order: 1 },
      { title: 'In Progress', order: 2 },
      { title: 'Fixed - Needs QA', order: 3 },
      { title: 'Verified', order: 4 },
    ],
  },
];
