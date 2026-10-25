import { hasLabel, type PlanFlag, type SpecificFinding } from './checks';
import type { ScheduleResult } from './schedule';
import type { GeneratedCard, Plan, PlanTask, Priority } from './types';

export const READ_ME_TITLE = 'Read me first: assumptions and gaps';
export const DECISIONS_TITLE = 'Decisions needed: choices only you can make';

const PRIORITY_COLOR: Record<Priority, string> = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };
const NO_COLOR = '#ffffff';
const MAX_EXCERPT = 170;

const trim = (s: string, max = MAX_EXCERPT) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function friendlyDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${WEEKDAYS[dow]} ${d} ${MONTHS[m - 1]}`;
}

function planCard(task: PlanTask, byKey: Map<string, PlanTask>, dueDate: string): GeneratedCard {
  const lines: string[] = [];
  const deps = task.dependsOn.map((k) => byKey.get(k)?.title).filter((t): t is string => Boolean(t));
  if (deps.length > 0) lines.push(`Depends on: ${deps.join('; ')}`);
  if (task.description) lines.push(task.description);
  if (task.whyItMatters) lines.push(`Why this matters: ${task.whyItMatters}`);
  return {
    title: task.title,
    priority: task.priority,
    description: lines.join('\n'),
    checklist: task.checklist,
    notes: task.notes,
    tags: task.tags,
    color: PRIORITY_COLOR[task.priority],
    dueDate,
  };
}

// Every sentence or checklist item on a plan card that carries an assumption label,
// so the Read-me-first card can list exactly what the cards say.
export function collectLabeledItems(tasks: PlanTask[]): { cardTitle: string; text: string }[] {
  const out: { cardTitle: string; text: string }[] = [];
  const split = (s: string) => s.split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/);
  for (const t of tasks) {
    for (const s of [...split(t.description), ...split(t.whyItMatters), ...split(t.notes)]) {
      if (s && hasLabel(s)) out.push({ cardTitle: t.title, text: s });
    }
    for (const item of t.checklist) if (hasLabel(item)) out.push({ cardTitle: t.title, text: item });
  }
  return out;
}

function pacingLine(schedule: ScheduleResult): string {
  const start = friendlyDate(schedule.firstWorkingDay);
  return schedule.hoursPerWeekAssumed
    ? `Pacing assumed: about ${schedule.hoursPerWeek} hours a week, starting ${start} (you did not say how much time you have). If you add your hours per week or a start date to the description and generate again, the dates will follow.`
    : `Pacing used: ${schedule.hoursPerWeek} hours a week, starting ${start}, as you described.`;
}

function deadlineLine(schedule: ScheduleResult): string | null {
  if (!schedule.deadline) return null;
  if (schedule.deadlineMet) {
    return `Deadline ${friendlyDate(schedule.deadline)}: this plan fits at that pace (last card due ${friendlyDate(schedule.endDate)}).`;
  }
  const days = schedule.overrunBusinessDays ?? 1;
  const parts = [
    `Deadline ${friendlyDate(schedule.deadline)}: NOT met at ${schedule.hoursPerWeek} hours a week.`,
    schedule.hoursAvailableByDeadline !== undefined
      ? `About ${schedule.hoursAvailableByDeadline} hours of work fit before then; the plan needs about ${Math.round(schedule.totalHours)}.`
      : '',
    `The last card is due ${friendlyDate(schedule.endDate)}, about ${days} working day${days === 1 ? '' : 's'} late. The dates below are honest, not squeezed.`,
  ];
  if (schedule.hoursPerWeekNeeded) parts.push(`Meeting it would take about ${schedule.hoursPerWeekNeeded} hours a week.`);
  const cardCount = Object.keys(schedule.dueDates).length;
  const give = schedule.wouldHaveToGive ?? [];
  if (schedule.fitsAfterDeferring && give.length > 0 && give.length <= cardCount / 2) {
    parts.push(`Or defer these optional cards: ${give.map((d) => `"${d.title}"`).join(', ')}.`);
  } else if (schedule.fitsAfterDeferring === false) {
    parts.push('Deferring optional cards alone would not be enough, so this deadline needs more hours a week or a later date.');
  }
  return parts.filter(Boolean).join(' ');
}

export interface ComposeInput {
  plan: Plan;
  schedule: ScheduleResult;
  findings: SpecificFinding[];
  flags: PlanFlag[];
  warnings: string[];
}

export function composeReadMeCard(input: ComposeInput): GeneratedCard {
  const { plan, schedule, findings, flags, warnings } = input;

  const description = [
    'This plan is a starting point and may still have gaps. Read the items below before relying on it.',
    'The dates are suggestions meant to keep momentum. Moving one is normal, and overdue cards simply show in red.',
    pacingLine(schedule),
    deadlineLine(schedule),
  ]
    .filter((l): l is string => Boolean(l))
    .join('\n');

  const checklist: string[] = [];
  for (const a of plan.assumptions) {
    const how = a.howToVerify ? ` How to check: ${a.howToVerify}` : '';
    checklist.push(trim(`${a.text}${how}`, 260).replace(/^(?!Assumption)/, 'Assumption, verify: '));
  }
  const alreadyListed = new Set(checklist.map((c) => c.toLowerCase()));
  for (const item of collectLabeledItems(plan.tasks)) {
    const entry = `On "${trim(item.cardTitle, 60)}": ${trim(item.text)}`;
    if (!alreadyListed.has(entry.toLowerCase())) {
      checklist.push(entry);
      alreadyListed.add(entry.toLowerCase());
    }
  }
  if (findings.some((f) => !f.autoLabeled)) {
    for (const f of findings.filter((x) => !x.autoLabeled)) {
      checklist.push(`In a card title, "${trim(f.excerpt, 90)}" states ${f.specifics.join(', ')}. Verify it with the official source.`);
    }
  }
  if (checklist.length === 0) {
    checklist.push(
      'No unverified prices, rates, links or named communities were found. (This check only recognizes those kinds of claims; it cannot judge whether anything else in the plan is right.)'
    );
  } else {
    checklist.push('For any price, rate or rule above: check the vendor or official source directly, or ask a professional for anything legal or financial.');
  }

  const notes: string[] = [];
  const section = (heading: string, items: string[]) => {
    if (items.length > 0) notes.push(`${heading}\n${items.map((i) => `- ${i}`).join('\n')}`);
  };
  section('NOT MENTIONED IN YOUR DESCRIPTION (often matters):', plan.gaps);
  section('THINGS THIS PLAN CANNOT KNOW:', plan.unknowns);
  section(
    'POSSIBLE CONFLICTS TO CHECK:',
    flags.filter((f) => f.type === 'conflict-with-constraint' || f.type === 'target-redefined' || f.type === 'verify-first').map((f) => f.message)
  );
  section('PLAN NOTES:', warnings);

  return {
    title: READ_ME_TITLE,
    priority: 'high',
    description,
    checklist,
    notes: notes.join('\n\n'),
    tags: ['planning'],
    color: NO_COLOR,
    dueDate: schedule.firstWorkingDay,
  };
}

export function composeDecisionsCard(plan: Plan, firstWorkingDay: string): GeneratedCard | null {
  const items: string[] = [];
  for (const d of plan.decisionsNeeded) {
    const options = d.options.length > 0 ? ` Options: ${d.options.join(' / ')}.` : '';
    const rec = d.recommended ? ` Recommended default: ${d.recommended}.` : '';
    items.push(`${d.question}${options}${rec}`);
  }
  for (const s of plan.facts.stack.filter((x) => x.source === 'recommended')) {
    items.push(`Recommended default for ${s.role}: ${s.choice}.${s.reason ? ` Why: ${s.reason}` : ''}`);
  }
  if (items.length === 0) return null;
  return {
    title: DECISIONS_TITLE,
    priority: 'high',
    description:
      'These choices were not in your description, so they are yours to make. Each has a recommended default: accept it and move on, or swap it for your own.',
    checklist: items,
    notes: '',
    tags: ['decisions'],
    color: PRIORITY_COLOR.high,
    dueDate: firstWorkingDay,
  };
}

// Cards are listed in the order they are due, so the Backlog reads as a timeline.
// A prerequisite is always due on or before what depends on it, and ties keep the
// plan's dependency order, so this never puts a card ahead of its prerequisite.
export function dueOrder(tasks: PlanTask[], dueDates: Record<string, string>): PlanTask[] {
  return tasks
    .map((t, i) => ({ t, i }))
    .sort((a, b) => {
      const da = dueDates[a.t.key] ?? '';
      const db = dueDates[b.t.key] ?? '';
      return da < db ? -1 : da > db ? 1 : a.i - b.i;
    })
    .map(({ t }) => t);
}

const KEY_LIKE = /^[A-Za-z]{1,3}_?\d{1,3}$/;

// The model sometimes writes "see T3" inside card text. The reader never sees the
// keys, so swap each one for the title of the card it points to.
export function replaceKeyReferences(text: string, plan: Plan): string {
  if (!text) return text;
  const keys = plan.tasks.map((t) => t.key).filter((k) => KEY_LIKE.test(k));
  if (keys.length === 0) return text;
  const titleOf = new Map(plan.tasks.map((t) => [t.key, t.title]));
  const pattern = new RegExp(`\\b(?:${keys.sort((a, b) => b.length - a.length).join('|')})\\b`, 'g');
  return text.replace(pattern, (k) => `"${titleOf.get(k)}"`);
}

export function composeCards(input: ComposeInput): GeneratedCard[] {
  const { plan, schedule } = input;
  const byKey = new Map(plan.tasks.map((t) => [t.key, t]));
  const cards: GeneratedCard[] = [composeReadMeCard(input)];
  const decisions = composeDecisionsCard(plan, schedule.firstWorkingDay);
  if (decisions) cards.push(decisions);
  for (const t of dueOrder(plan.tasks, schedule.dueDates)) {
    cards.push(planCard(t, byKey, schedule.dueDates[t.key] ?? schedule.firstWorkingDay));
  }
  return cards.map((c) => ({
    ...c,
    description: replaceKeyReferences(c.description, plan),
    checklist: c.checklist.map((item) => replaceKeyReferences(item, plan)),
    notes: replaceKeyReferences(c.notes, plan),
  }));
}
