// Shapes for the "Generate Tasks" plan. The model returns a Plan; pure functions
// validate it, schedule it, and turn it into ordinary kanban cards. Nothing here
// changes the stored card schema.

export type Priority = 'high' | 'medium' | 'low';

// work: ordinary build/do step. validation: a test that de-risks an assumption.
// decision-gate: a go/no-go checkpoint placed after the work it judges.
// external-wait: a step dominated by time nobody can speed up (approvals, registrations, recruiting).
export type TaskKind = 'work' | 'validation' | 'decision-gate' | 'external-wait';

export type EffortSize = 'S' | 'M' | 'L';

export interface PlanTask {
  key: string; // stable id inside one plan, e.g. "T3"
  kind: TaskKind;
  title: string;
  priority: Priority;
  description: string;
  whyItMatters: string;
  dependsOn: string[]; // keys of prerequisite tasks
  effort: { size: EffortSize; hours: number };
  waitDays: number; // calendar days that effort cannot shorten (0 for ordinary work)
  checklist: string[];
  notes: string;
  tags: string[];
}

export interface StackChoice {
  role: string; // e.g. "backend", "payments"
  choice: string;
  source: 'input' | 'recommended';
  reason: string;
  avoid: string[]; // alternatives that must NOT appear in cards for this role
}

export interface PlanTarget {
  name: string;
  value: string; // the literal number/phrase, defined in exactly one card
  definedIn: string; // task key
}

export interface PlanSchedule {
  startDate: string | null; // YYYY-MM-DD, only if the user stated one
  deadline: string | null; // YYYY-MM-DD, only if the user stated one
  hoursPerWeek: number | null; // only if the user stated it
}

export interface PlanFacts {
  summary: string;
  stack: StackChoice[];
  targets: PlanTarget[];
  constraints: string[];
  mustNotInclude: string[]; // phrases that would contradict a stated constraint
  schedule: PlanSchedule;
}

export interface Assumption {
  text: string;
  howToVerify: string;
}

export interface DecisionNeeded {
  question: string;
  options: string[];
  recommended: string;
}

export interface Plan {
  overview: string;
  facts: PlanFacts;
  assumptions: Assumption[];
  gaps: string[]; // topics the user's description did not mention that usually matter
  unknowns: string[]; // things the model cannot know (current prices, platform rules, local regulations)
  decisionsNeeded: DecisionNeeded[];
  tasks: PlanTask[];
}

export type ParseResult =
  | { ok: true; plan: Plan; warnings: string[] }
  | { ok: false; reason: 'malformed' | 'empty' };

// A kanban card ready to hand to the existing addCard action.
export interface GeneratedCard {
  title: string;
  priority: Priority;
  description: string;
  checklist: string[];
  notes: string;
  tags: string[];
  color: string;
  dueDate: string; // YYYY-MM-DD
}
