import type { Plan, PlanTask } from './types';

// ---------------------------------------------------------------------------
// Unverified specifics: prices, percentages, URLs, quotas/rates, named
// communities. Anything like that which did not come from the user's input must
// carry an assumption label. This is a heuristic scan, not a fact-checker: it
// only recognizes the patterns below and cannot judge whether a claim is true.
// ---------------------------------------------------------------------------

export const ASSUMPTION_LABEL = 'Assumption, verify:';

const CURRENCY =
  /(?:US?\$|\$|€|£)\s?\d[\d,]*(?:\.\d+)?(?:\s?[-–]\s?(?:US?\$|\$|€|£)?\s?\d[\d,]*(?:\.\d+)?)?(?:\s?[kKM]\b)?|\b\d[\d,]*(?:\.\d+)?\s?(?:USD|EUR|GBP|dollars|cents)\b/g;
const PERCENT = /\b\d+(?:\.\d+)?\s?%/g;
const URL_LIKE =
  /\bhttps?:\/\/[^\s)"']+|\bwww\.[^\s)"']+|(?<![@\w.-])[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:com|org|net|io|gov|edu|app|dev|co|ai)\b(?:\/[^\s)"']*)?/gi;
// Obvious stand-ins in examples ("in.yourapp.com") are not claims about the real world.
const PLACEHOLDER_URL = /yourapp|yourdomain|yoursite|yourcompany|example\.|\.example\b/i;
// A sentence that tells the reader to go and check something names a source; it is not itself a claim.
const VERIFY_INSTRUCTION =
  /^\s*(?:assumption, verify:\s*)?(?:check|verify|confirm|look up|read|ask|see|visit|review|consult|contact|open|create|install|download|sign up|sign in|log in|register|go to|use|add|connect|enable|copy|paste|run|try|set up|get)\b/i;
const whole = (re: RegExp) => new RegExp(`^(?:${re.source})$`, 'i');
const COMMUNITY =
  /\br\/[A-Za-z0-9_]+|\bsubreddit\b|\b(?:Facebook group|Slack workspace|Discord server|Slack community)\s+(?:called|named)\s+["“']?[A-Z][\w&' ]{2,40}/g;
const QUOTA =
  /\b\d[\d,.]*\s?k?\s?(?:messages?|emails?|texts?|sms|requests?|calls?|reads?|writes?|events?|users?|credits?|minutes)\s?(?:\/|per|a|each)\s?(?:day|month|hour|minute|second|week|year)\b/gi;
const FREE_ALLOWANCE = /\bfree (?:up to|until|for the first) \d[\d,.]*/gi;

const LABEL = /\b(assumption|unverified|verify with the official source|check with a professional|question:)/i;
const BENIGN = new Set(['100%']);

const norm = (s: string) => s.toLowerCase().replace(/[\s,]+/g, '');

export function hasLabel(text: string): boolean {
  return LABEL.test(text);
}

export function findSpecifics(text: string): string[] {
  const out: string[] = [];
  for (const re of [CURRENCY, PERCENT, URL_LIKE, COMMUNITY, QUOTA, FREE_ALLOWANCE]) {
    for (const m of text.matchAll(re)) {
      if (re === URL_LIKE && PLACEHOLDER_URL.test(m[0])) continue;
      out.push(m[0].trim());
    }
  }
  return Array.from(new Set(out)).filter((s) => !BENIGN.has(s));
}

// Specifics that did not come from the user's own words.
function ungroundedSpecifics(text: string, inputNorm: string): string[] {
  const isInstruction = VERIFY_INSTRUCTION.test(text);
  const urlOnly = whole(URL_LIKE);
  return findSpecifics(text).filter((s) => {
    if (inputNorm.includes(norm(s))) return false;
    if (urlOnly.test(s)) {
      // "Check example.org or contact support" points at a source to verify against.
      if (isInstruction) return false;
      // "(e.g. dnschecker.org)" names an example tool, it does not assert a fact.
      const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`(?:e\\.g\\.,?|for example,?|such as|like)\\s[^.]{0,60}${escaped}`, 'i').test(text)) return false;
    }
    return true;
  });
}

export interface SpecificFinding {
  taskKey: string;
  field: 'title' | 'description' | 'whyItMatters' | 'notes' | 'checklist';
  excerpt: string;
  specifics: string[];
  autoLabeled: boolean;
}

const SENTENCE_SPLIT = /(?<=[.!?])\s+(?=[A-Z0-9"'(])/;

function labelSentences(text: string, inputNorm: string, onFinding: (excerpt: string, s: string[]) => void): string {
  if (!text) return text;
  return text
    .split(SENTENCE_SPLIT)
    .map((sentence) => {
      if (hasLabel(sentence)) return sentence;
      const specifics = ungroundedSpecifics(sentence, inputNorm);
      if (specifics.length === 0) return sentence;
      onFinding(sentence, specifics);
      return `${ASSUMPTION_LABEL} ${sentence}`;
    })
    .join(' ');
}

// Prefixes every sentence / checklist item that states an ungrounded specific as
// fact with the assumption label, and returns what it changed. Titles are only
// reported (rewriting a title would change what the card is about).
export function labelUnverifiedSpecifics(
  plan: Plan,
  inputText: string
): { plan: Plan; findings: SpecificFinding[] } {
  const inputNorm = norm(inputText);
  const findings: SpecificFinding[] = [];
  const tasks: PlanTask[] = plan.tasks.map((t) => {
    const record =
      (field: SpecificFinding['field'], autoLabeled: boolean) => (excerpt: string, specifics: string[]) =>
        findings.push({ taskKey: t.key, field, excerpt, specifics, autoLabeled });

    const titleHits = ungroundedSpecifics(t.title, inputNorm);
    if (titleHits.length > 0 && !hasLabel(t.title)) record('title', false)(t.title, titleHits);

    return {
      ...t,
      description: labelSentences(t.description, inputNorm, record('description', true)),
      whyItMatters: labelSentences(t.whyItMatters, inputNorm, record('whyItMatters', true)),
      notes: labelSentences(t.notes, inputNorm, record('notes', true)),
      checklist: t.checklist.map((item) => {
        if (hasLabel(item)) return item;
        const specifics = ungroundedSpecifics(item, inputNorm);
        if (specifics.length === 0) return item;
        record('checklist', true)(item, specifics);
        return `${ASSUMPTION_LABEL} ${item}`;
      }),
    };
  });
  return { plan: { ...plan, tasks }, findings };
}

// ---------------------------------------------------------------------------
// Structural checks. Each returns the offending items; none mutate the plan.
// ---------------------------------------------------------------------------

export interface PlanFlag {
  type:
    | 'verify-first'
    | 'conflict-with-constraint'
    | 'target-redefined'
    | 'checklist-oversized'
    | 'checklist-uniform'
    | 'effort-oversized';
  taskKey?: string;
  message: string;
}

const PRIORITY_RANK = { low: 0, medium: 1, high: 2 } as const;

export function dependencyOrderViolations(tasks: PlanTask[]): { taskKey: string; dependsOn: string }[] {
  const position = new Map(tasks.map((t, i) => [t.key, i]));
  const out: { taskKey: string; dependsOn: string }[] = [];
  for (const t of tasks) {
    for (const d of t.dependsOn) {
      const p = position.get(d);
      if (p === undefined || p >= position.get(t.key)!) out.push({ taskKey: t.key, dependsOn: d });
    }
  }
  return out;
}

export function priorityViolations(tasks: PlanTask[]): { taskKey: string; dependent: string }[] {
  const byKey = new Map(tasks.map((t) => [t.key, t]));
  const out: { taskKey: string; dependent: string }[] = [];
  for (const t of tasks) {
    for (const d of t.dependsOn) {
      const dep = byKey.get(d);
      if (dep && PRIORITY_RANK[dep.priority] < PRIORITY_RANK[t.priority]) out.push({ taskKey: d, dependent: t.key });
    }
  }
  return out;
}

const NEGATION = /\b(not|instead of|rather than|avoid|don't|do not|without|never)\b/i;

function allText(t: PlanTask): string[] {
  return [t.title, t.description, t.whyItMatters, t.notes, ...t.checklist];
}

function mentions(text: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\w])${escaped}(?![\\w])`, 'i').test(text);
}

export function checkPlan(plan: Plan): PlanFlag[] {
  const flags: PlanFlag[] = [];
  const { tasks, facts } = plan;

  // Contradictions with the declared stack / constraints. Only as good as what the
  // plan declared: a conflict the model never wrote down cannot be found here.
  const forbidden = [...facts.mustNotInclude, ...facts.stack.flatMap((s) => s.avoid)].filter(Boolean);
  for (const t of tasks) {
    for (const phrase of forbidden) {
      const hit = allText(t).find((line) => mentions(line, phrase) && !NEGATION.test(line));
      if (hit) {
        flags.push({
          type: 'conflict-with-constraint',
          taskKey: t.key,
          message: `"${t.title}" mentions "${phrase}", which the plan says not to use.`,
        });
      }
    }
  }

  // Each target is defined in exactly one card.
  for (const target of facts.targets) {
    for (const t of tasks) {
      if (t.key === target.definedIn) continue;
      if (allText(t).some((line) => mentions(line, target.value))) {
        flags.push({
          type: 'target-redefined',
          taskKey: t.key,
          message: `"${t.title}" repeats the "${target.name}" target (${target.value}) instead of referring to the card that defines it.`,
        });
      }
    }
  }

  // A card carrying an assumption label should start with a step that checks it.
  for (const t of tasks) {
    const labeled = [t.description, t.whyItMatters, t.notes, ...t.checklist].some(hasLabel);
    const first = t.checklist[0] ?? '';
    if (labeled && t.kind === 'work' && !/^(?:assumption, verify:\s*)?(verify|confirm|check|ask|test|look up)\b/i.test(first)) {
      flags.push({
        type: 'verify-first',
        taskKey: t.key,
        message: `"${t.title}" rests on an unchecked assumption but its first step is not a check.`,
      });
    }
  }

  // Shape: cards sized to the work, not to a template.
  for (const t of tasks) {
    if (t.checklist.length > 8) {
      flags.push({ type: 'checklist-oversized', taskKey: t.key, message: `"${t.title}" has ${t.checklist.length} checklist items; consider splitting it.` });
    }
    if (t.effort.hours > 16) {
      flags.push({ type: 'effort-oversized', taskKey: t.key, message: `"${t.title}" is estimated at ${t.effort.hours}h; consider splitting it.` });
    }
  }
  if (tasks.length >= 4 && new Set(tasks.map((t) => t.checklist.length)).size === 1) {
    flags.push({ type: 'checklist-uniform', message: `Every card has exactly ${tasks[0].checklist.length} checklist items.` });
  }

  return flags;
}
