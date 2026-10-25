import type { PlanTask, Priority } from './types';

// Deterministic due-date scheduler. The model supplies effort, dependencies and
// waiting periods; this turns them into dates, so the dates are testable and
// never depend on the model doing calendar arithmetic.
//
// Model: one person, working Monday-Friday, with a weekly hour budget. Work cards
// consume that budget one after another. Waiting steps (approvals, registrations,
// recruiting) consume a little kickoff effort and then run in calendar time while
// the person does other work. All date math is on plain YYYY-MM-DD strings in UTC,
// so the result never depends on the server's time zone.

export const DEFAULT_HOURS_PER_WEEK = 10;

export interface ScheduleOptions {
  // First day work can start, YYYY-MM-DD. Pass the USER'S local date, not the
  // server's. Weekends roll forward to Monday.
  startDate: string;
  hoursPerWeek?: number | null;
  deadline?: string | null;
}

export interface Deferral {
  taskKey: string;
  title: string;
  hours: number;
}

export interface ScheduleResult {
  dueDates: Record<string, string>;
  firstWorkingDay: string;
  endDate: string;
  hoursPerWeek: number;
  hoursPerWeekAssumed: boolean;
  totalHours: number;
  deadline: string | null;
  deadlineMet: boolean | null;
  // Present only when the deadline cannot be met at this capacity.
  overrunBusinessDays?: number;
  // Hours of work that fit between the first working day and the deadline at this pace,
  // and the weekly hours that would be needed to meet it. Present when a deadline was given.
  hoursAvailableByDeadline?: number;
  hoursPerWeekNeeded?: number | null;
  // Lowest-priority, nothing-depends-on-it cards that would have to be deferred to
  // fit; `fitsAfterDeferring` is false if even that is not enough.
  wouldHaveToGive?: Deferral[];
  fitsAfterDeferring?: boolean;
}

const DAY_MS = 86_400_000;
const PRIORITY_RANK: Record<Priority, number> = { low: 0, medium: 1, high: 2 };

const parseYmd = (s: string): number => {
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const formatYmd = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
const isBusinessDay = (ms: number): boolean => {
  const dow = new Date(ms).getUTCDay();
  return dow >= 1 && dow <= 5;
};
const nextBusinessDayOnOrAfter = (ms: number): number => {
  let t = ms;
  while (!isBusinessDay(t)) t += DAY_MS;
  return t;
};

// Maps between "business day number" (0 = first working day) and calendar dates.
class BusinessCalendar {
  private readonly first: number;
  private readonly days: number[] = [];
  constructor(startDate: string) {
    this.first = nextBusinessDayOnOrAfter(parseYmd(startDate));
    this.days.push(this.first);
  }
  get firstWorkingDay(): string {
    return formatYmd(this.first);
  }
  dateOf(index: number): string {
    while (this.days.length <= index) {
      this.days.push(nextBusinessDayOnOrAfter(this.days[this.days.length - 1] + DAY_MS));
    }
    return formatYmd(this.days[index]);
  }
  // Index of the first business day on or after the given calendar date.
  indexOnOrAfter(dateYmd: string): number {
    const target = nextBusinessDayOnOrAfter(parseYmd(dateYmd));
    if (target <= this.first) return 0;
    let i = 0;
    while (this.days.length <= i || this.days[i] < target) {
      i++;
      this.dateOf(i);
    }
    return i;
  }
}

const addCalendarDays = (ymd: string, n: number): string => formatYmd(parseYmd(ymd) + n * DAY_MS);

function runSchedule(
  tasks: PlanTask[],
  startDate: string,
  hoursPerWeek: number
): { dueDates: Record<string, string>; endDate: string; firstWorkingDay: string } {
  const cal = new BusinessCalendar(startDate);
  const perDay = hoursPerWeek / 5;
  const byKey = new Map(tasks.map((t) => [t.key, t]));
  const planIndex = new Map(tasks.map((t, i) => [t.key, i]));

  const dueDay = new Map<string, number>(); // business-day index each card is due
  const readyAfter = new Map<string, number>(); // time (in business-day units) dependents may start
  const scheduled = new Set<string>();
  let cursor = 0; // worker's time, in business-day units (integer part = day index)

  const candidateStart = (t: PlanTask): number => {
    let ready = 0;
    for (const d of t.dependsOn) {
      if (!byKey.has(d)) continue;
      ready = Math.max(ready, readyAfter.get(d) ?? 0);
    }
    if (t.kind === 'decision-gate') {
      // Review the day after the work it judges is due, never the same day.
      const lastDep = Math.max(-1, ...t.dependsOn.filter((d) => dueDay.has(d)).map((d) => dueDay.get(d)!));
      ready = Math.max(ready, lastDep + 1);
      // A review is short and blocks everything after it, so it interrupts other work
      // instead of queueing behind it.
      return ready;
    }
    return Math.max(cursor, ready);
  };

  const remaining = new Set(tasks.map((t) => t.key));
  while (remaining.size > 0) {
    let ready = [...remaining]
      .map((k) => byKey.get(k)!)
      .filter((t) => t.dependsOn.every((d) => !byKey.has(d) || scheduled.has(d)));
    if (ready.length === 0) ready = [byKey.get([...remaining][0])!]; // defensive: never loop forever

    // Earliest possible start wins; ties go to long-lead waiting steps, then priority, then plan order.
    ready.sort((a, b) => {
      const sa = candidateStart(a);
      const sb = candidateStart(b);
      if (Math.abs(sa - sb) > 1e-9) return sa - sb;
      const wa = a.kind === 'external-wait' ? 1 : 0;
      const wb = b.kind === 'external-wait' ? 1 : 0;
      if (wa !== wb) return wb - wa;
      // A decision gate is a short review that blocks everything after it: do it as soon as it is ready.
      const ga = a.kind === 'decision-gate' ? 1 : 0;
      const gb = b.kind === 'decision-gate' ? 1 : 0;
      if (ga !== gb) return gb - ga;
      const pa = PRIORITY_RANK[a.priority];
      const pb = PRIORITY_RANK[b.priority];
      if (pa !== pb) return pb - pa;
      return planIndex.get(a.key)! - planIndex.get(b.key)!;
    });

    const task = ready[0];
    const start = candidateStart(task);
    const finish = start + task.effort.hours / perDay;
    const lastDay = Math.max(Math.floor(start), Math.ceil(finish - 1e-9) - 1);

    // A gate that interrupts busy work still costs its hours, which push later work back.
    cursor = task.kind === 'decision-gate' && start < cursor ? cursor + task.effort.hours / perDay : finish;
    scheduled.add(task.key);
    remaining.delete(task.key);

    if (task.waitDays > 0) {
      // Kickoff effort is done on lastDay; then calendar time passes with the worker free.
      const waitEnds = addCalendarDays(cal.dateOf(lastDay), task.waitDays);
      const idx = cal.indexOnOrAfter(waitEnds);
      dueDay.set(task.key, Math.max(idx, lastDay));
      readyAfter.set(task.key, Math.max(idx, lastDay));
    } else {
      dueDay.set(task.key, lastDay);
      readyAfter.set(task.key, finish);
    }
  }

  const dueDates: Record<string, string> = {};
  let maxDay = 0;
  for (const t of tasks) {
    const day = dueDay.get(t.key) ?? 0;
    maxDay = Math.max(maxDay, day);
    dueDates[t.key] = cal.dateOf(day);
  }
  return { dueDates, endDate: cal.dateOf(maxDay), firstWorkingDay: cal.firstWorkingDay };
}

// Optional cards nothing else depends on, cheapest to defer first: lowest priority, then
// latest in the plan. High-priority cards and decision gates are never offered: they are
// the goal itself or the checkpoints that protect it, so dropping them is not a trade-off.
function deferralOrder(tasks: PlanTask[]): PlanTask[] {
  const needed = new Set(tasks.flatMap((t) => t.dependsOn));
  return tasks
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => !needed.has(t.key) && t.priority !== 'high' && t.kind !== 'decision-gate')
    .sort((a, b) => PRIORITY_RANK[a.t.priority] - PRIORITY_RANK[b.t.priority] || b.i - a.i)
    .map(({ t }) => t);
}

export function scheduleTasks(tasks: PlanTask[], opts: ScheduleOptions): ScheduleResult {
  const hoursPerWeek = opts.hoursPerWeek && opts.hoursPerWeek > 0 ? opts.hoursPerWeek : DEFAULT_HOURS_PER_WEEK;
  const hoursPerWeekAssumed = !(opts.hoursPerWeek && opts.hoursPerWeek > 0);
  const deadline = opts.deadline ?? null;

  const full = runSchedule(tasks, opts.startDate, hoursPerWeek);
  const result: ScheduleResult = {
    dueDates: full.dueDates,
    firstWorkingDay: full.firstWorkingDay,
    endDate: full.endDate,
    hoursPerWeek,
    hoursPerWeekAssumed,
    totalHours: tasks.reduce((sum, t) => sum + t.effort.hours, 0),
    deadline,
    deadlineMet: deadline ? full.endDate <= deadline : null,
  };
  if (!deadline || result.deadlineMet) return result;

  const cal = new BusinessCalendar(opts.startDate);
  result.overrunBusinessDays = Math.max(1, cal.indexOnOrAfter(full.endDate) - cal.indexOnOrAfter(deadline));

  // Business days from the first working day through the deadline, inclusive.
  let daysAvailable = 0;
  for (let t = parseYmd(full.firstWorkingDay); t <= parseYmd(deadline); t += DAY_MS) {
    if (isBusinessDay(t)) daysAvailable++;
  }
  result.hoursAvailableByDeadline = Math.round(daysAvailable * (hoursPerWeek / 5) * 10) / 10;
  result.hoursPerWeekNeeded = daysAvailable > 0 ? Math.ceil((result.totalHours / daysAvailable) * 5) : null;

  // What would have to give? Defer lowest-priority leaf cards one at a time until it fits.
  const gone: PlanTask[] = [];
  let remaining = tasks;
  let fits = false;
  while (remaining.length > 1) {
    // Recomputed each round: deferring a card can turn its prerequisite into a new leaf.
    const candidate = deferralOrder(remaining)[0];
    if (!candidate) break;
    remaining = remaining.filter((t) => t.key !== candidate.key);
    gone.push(candidate);
    if (runSchedule(remaining, opts.startDate, hoursPerWeek).endDate <= deadline) {
      fits = true;
      break;
    }
  }
  result.wouldHaveToGive = gone.map((t) => ({ taskKey: t.key, title: t.title, hours: t.effort.hours }));
  result.fitsAfterDeferring = fits;
  return result;
}

// Tests and verification runs use this to prove the dates follow the plan:
// nothing is due before a prerequisite, and a decision gate is due strictly after
// the work it judges.
export function dateOrderViolations(
  tasks: PlanTask[],
  dueDates: Record<string, string>
): { taskKey: string; dependsOn: string; reason: 'before-prerequisite' | 'gate-not-after' }[] {
  const out: { taskKey: string; dependsOn: string; reason: 'before-prerequisite' | 'gate-not-after' }[] = [];
  const byKey = new Map(tasks.map((t) => [t.key, t]));
  for (const t of tasks) {
    for (const d of t.dependsOn) {
      if (!byKey.has(d)) continue;
      if (dueDates[t.key] < dueDates[d]) out.push({ taskKey: t.key, dependsOn: d, reason: 'before-prerequisite' });
      else if (t.kind === 'decision-gate' && dueDates[t.key] <= dueDates[d]) {
        out.push({ taskKey: t.key, dependsOn: d, reason: 'gate-not-after' });
      }
    }
  }
  return out;
}
