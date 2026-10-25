import type {
  Assumption,
  DecisionNeeded,
  EffortSize,
  ParseResult,
  Plan,
  PlanFacts,
  PlanTask,
  Priority,
  StackChoice,
  TaskKind,
} from './types';

const PRIORITY_RANK: Record<Priority, number> = { low: 0, medium: 1, high: 2 };
const KINDS: TaskKind[] = ['work', 'validation', 'decision-gate', 'external-wait'];
const SIZE_HOURS: Record<EffortSize, number> = { S: 2, M: 6, L: 14 };
export const MAX_TAGS_PER_PLAN = 12;
const MAX_CHECKLIST_ITEMS = 10;

type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(str).filter((s) => s.length > 0) : [];

function extractJson(rawText: string): unknown {
  let text = rawText.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try {
    return JSON.parse(text);
  } catch {
    // The model sometimes wraps the object in a sentence; take the outermost braces.
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first === -1 || last <= first) return undefined;
    text = text.slice(first, last + 1);
    try {
      return JSON.parse(text);
    } catch {
      return undefined;
    }
  }
}

function parseDate(v: unknown): string | null {
  const s = str(v);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function parsePriority(v: unknown): Priority {
  const s = str(v).toLowerCase();
  return s === 'high' || s === 'low' ? s : 'medium';
}

function parseEffort(v: unknown, kind: TaskKind): { size: EffortSize; hours: number } {
  const o = isObject(v) ? v : {};
  const sizeIn = str(o.size).toUpperCase();
  let size: EffortSize;
  let hours: number;
  if (typeof o.hours === 'number' && Number.isFinite(o.hours)) {
    hours = Math.min(Math.max(o.hours, 0.5), 40);
    size = hours <= 4 ? 'S' : hours <= 10 ? 'M' : 'L';
  } else {
    size = sizeIn === 'S' || sizeIn === 'L' ? sizeIn : 'M';
    hours = SIZE_HOURS[size];
  }
  // A decision gate is a short review session, not build work.
  if (kind === 'decision-gate') {
    hours = Math.min(Math.max(hours, 0.5), 3);
    size = 'S';
  }
  return { size, hours };
}

function parseTask(raw: unknown, index: number): PlanTask | null {
  if (!isObject(raw)) return null;
  const title = str(raw.title);
  if (!title) return null;
  const kindIn = str(raw.kind).toLowerCase() as TaskKind;
  const kind: TaskKind = KINDS.includes(kindIn) ? kindIn : 'work';
  const waitIn = typeof raw.waitDays === 'number' && Number.isFinite(raw.waitDays) ? raw.waitDays : 0;
  const waitDays = Math.min(Math.max(Math.round(waitIn), 0), 120);
  return {
    key: str(raw.key) || `T${index + 1}`,
    kind,
    title: kind === 'decision-gate' && !/^decision:/i.test(title) ? `Decision: ${title}` : title,
    priority: parsePriority(raw.priority),
    description: str(raw.description),
    whyItMatters: str(raw.whyItMatters),
    dependsOn: strList(raw.dependsOn),
    effort: parseEffort(raw.effort, kind),
    waitDays: kind === 'external-wait' && waitDays === 0 ? 1 : waitDays,
    checklist: strList(raw.checklist).slice(0, MAX_CHECKLIST_ITEMS),
    notes: str(raw.notes),
    tags: strList(raw.tags),
  };
}

function parseFacts(raw: unknown): PlanFacts {
  const o = isObject(raw) ? raw : {};
  const sched = isObject(o.schedule) ? o.schedule : {};
  const hours = typeof sched.hoursPerWeek === 'number' && sched.hoursPerWeek > 0 && sched.hoursPerWeek <= 80 ? sched.hoursPerWeek : null;
  const stack: StackChoice[] = Array.isArray(o.stack)
    ? o.stack
        .filter(isObject)
        .map((s) => ({
          role: str(s.role),
          choice: str(s.choice),
          source: (str(s.source) === 'recommended' ? 'recommended' : 'input') as 'input' | 'recommended',
          reason: str(s.reason),
          avoid: strList(s.avoid),
        }))
        .filter((s) => s.role && s.choice)
    : [];
  const targets = Array.isArray(o.targets)
    ? o.targets
        .filter(isObject)
        .map((t) => ({ name: str(t.name), value: str(t.value), definedIn: str(t.definedIn) }))
        .filter((t) => t.name && t.value)
    : [];
  return {
    summary: str(o.summary),
    stack,
    targets,
    constraints: strList(o.constraints),
    mustNotInclude: strList(o.mustNotInclude),
    schedule: { startDate: parseDate(sched.startDate), deadline: parseDate(sched.deadline), hoursPerWeek: hours },
  };
}

function resolveDependencies(tasks: PlanTask[], warnings: string[]): void {
  const byKey = new Map<string, PlanTask>();
  for (const t of tasks) {
    if (byKey.has(t.key)) {
      const renamed = `${t.key}_${tasks.indexOf(t) + 1}`;
      warnings.push(`Duplicate task key ${t.key}; renamed to ${renamed}`);
      t.key = renamed;
    }
    byKey.set(t.key, t);
  }
  const byTitle = new Map(tasks.map((t) => [t.title.toLowerCase(), t.key]));
  for (const t of tasks) {
    const resolved = t.dependsOn
      .map((d) => (byKey.has(d) ? d : byTitle.get(d.toLowerCase()) ?? ''))
      .filter((d) => d && d !== t.key);
    t.dependsOn = Array.from(new Set(resolved));
  }
}

// Stable topological order: prerequisites first, otherwise the model's order. If
// the model produced a cycle, the dependency edges pointing at later tasks are
// dropped (and reported) so the plan still schedules.
export function orderTasks(tasks: PlanTask[], warnings: string[] = []): PlanTask[] {
  const index = new Map(tasks.map((t, i) => [t.key, i]));
  const remaining = new Set(tasks.map((t) => t.key));
  const placed = new Set<string>();
  const ordered: PlanTask[] = [];
  const byKey = new Map(tasks.map((t) => [t.key, t]));

  while (remaining.size > 0) {
    const ready = [...remaining]
      .filter((k) => byKey.get(k)!.dependsOn.every((d) => placed.has(d)))
      .sort((a, b) => index.get(a)! - index.get(b)!);
    if (ready.length === 0) {
      // Cycle: cut the edges that point to tasks not yet placed, from the earliest task.
      const stuck = [...remaining].sort((a, b) => index.get(a)! - index.get(b)!)[0];
      const task = byKey.get(stuck)!;
      const cut = task.dependsOn.filter((d) => !placed.has(d));
      warnings.push(`Circular dependency: removed ${cut.join(', ')} from ${task.key}`);
      task.dependsOn = task.dependsOn.filter((d) => placed.has(d));
      continue;
    }
    const next = ready[0];
    remaining.delete(next);
    placed.add(next);
    ordered.push(byKey.get(next)!);
  }
  return ordered;
}

// A card's priority must be at least that of every card that depends on it.
export function propagatePriority(tasks: PlanTask[]): void {
  const byKey = new Map(tasks.map((t) => [t.key, t]));
  for (let i = tasks.length - 1; i >= 0; i--) {
    const t = tasks[i];
    for (const d of t.dependsOn) {
      const dep = byKey.get(d);
      if (dep && PRIORITY_RANK[dep.priority] < PRIORITY_RANK[t.priority]) dep.priority = t.priority;
    }
  }
}

// One vocabulary per plan: at most MAX_TAGS_PER_PLAN distinct tags, kebab-case,
// the most-used kept, every card still has at least one tag.
export function normalizeTags(tasks: PlanTask[], max = MAX_TAGS_PER_PLAN): void {
  const clean = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const reserved = new Set(['decision-gate', 'validation']);
  const counts = new Map<string, number>();
  for (const t of tasks) {
    t.tags = Array.from(new Set(t.tags.map(clean).filter(Boolean)));
    if (t.kind === 'decision-gate' && !t.tags.includes('decision-gate')) t.tags.unshift('decision-gate');
    if (t.kind === 'validation' && !t.tags.includes('validation')) t.tags.unshift('validation');
    for (const tag of t.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  const keep = new Set(
    [...counts.entries()]
      .sort((a, b) => (reserved.has(b[0]) ? 1 : 0) - (reserved.has(a[0]) ? 1 : 0) || b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, max)
      .map(([tag]) => tag)
  );
  // A card left with no kept tag gets the plan's most common one, so the
  // vocabulary never grows past the cap.
  const fallback = [...keep][0] ?? 'planning';
  for (const t of tasks) {
    t.tags = t.tags.filter((tag) => keep.has(tag)).slice(0, 3);
    if (t.tags.length === 0) t.tags = [fallback];
  }
}

export function parsePlanReply(rawText: string): ParseResult {
  const json = extractJson(rawText);
  if (!isObject(json)) return { ok: false, reason: 'malformed' };

  const warnings: string[] = [];
  const parsed = (Array.isArray(json.tasks) ? json.tasks : [])
    .map((t, i) => parseTask(t, i))
    .filter((t): t is PlanTask => t !== null);
  if (parsed.length === 0) return { ok: false, reason: 'empty' };

  resolveDependencies(parsed, warnings);
  const tasks = orderTasks(parsed, warnings);
  propagatePriority(tasks);
  normalizeTags(tasks);

  const assumptions: Assumption[] = Array.isArray(json.assumptions)
    ? json.assumptions
        .filter(isObject)
        .map((a) => ({ text: str(a.text), howToVerify: str(a.howToVerify) }))
        .filter((a) => a.text)
    : [];
  const decisionsNeeded: DecisionNeeded[] = Array.isArray(json.decisionsNeeded)
    ? json.decisionsNeeded
        .filter(isObject)
        .map((d) => ({ question: str(d.question), options: strList(d.options), recommended: str(d.recommended) }))
        .filter((d) => d.question)
    : [];

  const plan: Plan = {
    overview: str(json.overview),
    facts: parseFacts(json.planFacts),
    assumptions,
    gaps: strList(json.gaps),
    decisionsNeeded,
    tasks,
  };
  return { ok: true, plan, warnings };
}
