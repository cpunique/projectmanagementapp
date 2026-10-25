import { hasLabel } from './checks';
import type { Plan, PlanTask } from './types';

// Deterministic check for the failure the old generator showed: a card builds on
// something an OUTSIDE platform supposedly provides (a link inside its emails, an API,
// an export, an integration) that nobody has shown exists. When a card claims that
// without an "Assumption, verify" label, a "Verify first" step is inserted at the top
// of its checklist, unless an earlier card in its chain already verifies it.
//
// How it finds "outside platforms": capitalized names in the person's OWN description
// that are not part of the plan's technology stack and not a well-known developer
// platform (whose capabilities are public documentation). It is a heuristic with known
// limits: it cannot recognize an outside system the person did not name with a capital
// letter ("the shop server"), and it only looks for the capability words below.

export type CapabilityClass = 'link' | 'api' | 'export';

const NOUNS: Record<CapabilityClass, string> = {
  link: 'links?|urls?|deep[- ]?links?',
  api: 'apis?|endpoints?|webhooks?|integrations?|sdks?',
  export: 'exports?|feeds?|csv|ical|imports?',
};
const LABEL_FOR: Record<CapabilityClass, string> = {
  link: 'link',
  api: 'API or integration',
  export: 'export or data feed',
};
const CLASSES = Object.keys(NOUNS) as CapabilityClass[];

// Platforms whose capabilities are published documentation rather than something that
// might not exist, plus common words that are capitalized in a sentence.
const IGNORED = new Set(
  (
    'react vite node nodejs next nextjs typescript javascript python html css firebase firestore google github stripe ' +
    'twilio railway vercel supabase mailgun sendgrid sentry expo aws azure apple android ios chrome safari postgres ' +
    'postgresql mongodb redis docker netlify cloudflare openai anthropic claude zapier slack discord cursor copilot ' +
    'windows linux mac code the and for with new january february march april may june july august september ' +
    'october november december monday tuesday wednesday thursday friday saturday sunday'
  ).split(' ')
);

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SENTENCE_SPLIT = /(?<=[.!?])\s+(?=[A-Z0-9"'(])|\n/;
const VERIFYING = /^\s*(?:assumption, verify:\s*)?(?:verify|confirm|check|ask|test|validate|find out|look up|decide whether)\b/i;
const NEGATED = /\b(not|never|don't|do not|without|instead of|rather than|avoid)\b/i;

export interface CapabilityFinding {
  taskKey: string;
  title: string;
  party: string;
  capability: CapabilityClass;
  excerpt: string;
}

export function externalParties(inputText: string, plan: Plan): string[] {
  const stackText = plan.facts.stack.map((s) => `${s.role} ${s.choice} ${s.avoid.join(' ')}`).join(' ').toLowerCase();
  const counts = new Map<string, number>();
  for (const m of inputText.matchAll(/\b[A-Z][a-z][A-Za-z0-9]{1,}\b/g)) counts.set(m[0], (counts.get(m[0]) ?? 0) + 1);

  const parties = new Set<string>();
  for (const sentence of inputText.split(/(?<=[.!?:;])\s+|\n/)) {
    const tokens = sentence.split(/[\s,()/]+/).filter(Boolean);
    tokens.forEach((tok, i) => {
      if (!/^[A-Z][a-z][A-Za-z0-9]{1,}$/.test(tok)) return;
      // A capitalized first word is only a name if it is capitalized elsewhere too.
      if (i === 0 && (counts.get(tok) ?? 0) < 2) return;
      const lower = tok.toLowerCase();
      if (IGNORED.has(lower) || stackText.includes(lower)) return;
      parties.add(tok);
    });
  }
  return [...parties];
}

function claimPattern(party: string, cls: CapabilityClass): RegExp {
  const p = escapeRe(party);
  const n = NOUNS[cls];
  return new RegExp(
    `\\b${p}(?:['’]s)?(?:\\s+[A-Za-z-]+){0,2}\\s+(?:${n})\\b|\\b(?:${n})\\s+(?:to|from|in|of|into|via|on)\\s+(?:the\\s+|a\\s+|an\\s+)?(?:[A-Za-z-]+\\s+){0,2}${p}\\b`,
    'i'
  );
}

const sentencesOf = (text: string) => text.split(SENTENCE_SPLIT).map((s) => s.trim()).filter(Boolean);
const linesOf = (t: PlanTask) => [t.title, ...sentencesOf(t.description), ...sentencesOf(t.whyItMatters), ...sentencesOf(t.notes), ...t.checklist];
const isVerifyingLine = (line: string) => VERIFYING.test(line) || line.includes('?') || /\bwhether\b/i.test(line);

const mentionsCapability = (line: string, party: string, cls: CapabilityClass) =>
  new RegExp(`\\b${escapeRe(party)}\\b`, 'i').test(line) && new RegExp(`\\b(?:${NOUNS[cls]})\\b`, 'i').test(line);

// What a card has verified BEFORE it builds anything: it is a validation card that
// deals with the capability, or its very first step is a verifying one. A test step at
// the end ("confirm the link opens") does not count: it checks the finished work, it
// does not protect the build.
function verifiedBy(task: PlanTask, parties: string[]): Set<string> {
  const out = new Set<string>();
  const first = task.checklist[0] ?? '';
  for (const party of parties) {
    for (const cls of CLASSES) {
      const id = `${party}|${cls}`;
      if (task.kind === 'validation' && linesOf(task).some((l) => mentionsCapability(l, party, cls))) out.add(id);
      else if (isVerifyingLine(first) && mentionsCapability(first, party, cls)) out.add(id);
    }
  }
  return out;
}

function claimsOf(task: PlanTask, parties: string[]): { party: string; cls: CapabilityClass; excerpt: string }[] {
  const out: { party: string; cls: CapabilityClass; excerpt: string }[] = [];
  const seen = new Set<string>();
  for (const line of linesOf(task)) {
    if (hasLabel(line) || isVerifyingLine(line) || NEGATED.test(line)) continue;
    for (const party of parties) {
      for (const cls of CLASSES) {
        const id = `${party}|${cls}`;
        if (!seen.has(id) && claimPattern(party, cls).test(line)) {
          seen.add(id);
          out.push({ party, cls, excerpt: line });
        }
      }
    }
  }
  return out;
}

export function verifyStepText(party: string, cls: CapabilityClass): string {
  return `Verify first: ${party} really provides the ${LABEL_FOR[cls]} this card relies on (check real examples or ask ${party}).`;
}

// Inserts "Verify first" steps. Cards are expected in dependency order (as parsePlanReply
// returns them), so a card's prerequisites have already been looked at.
export function insertCapabilityVerifySteps(
  plan: Plan,
  inputText: string
): { plan: Plan; findings: CapabilityFinding[] } {
  const parties = externalParties(inputText, plan);
  if (parties.length === 0) return { plan, findings: [] };

  const tasks = plan.tasks.map((t) => ({ ...t, checklist: [...t.checklist] }));
  const byKey = new Map(tasks.map((t) => [t.key, t]));
  const verified = new Map<string, Set<string>>();
  const findings: CapabilityFinding[] = [];

  const ancestorsOf = (key: string): string[] => {
    const seen = new Set<string>();
    const stack = [...(byKey.get(key)?.dependsOn ?? [])];
    while (stack.length > 0) {
      const k = stack.pop()!;
      if (seen.has(k) || !byKey.has(k)) continue;
      seen.add(k);
      stack.push(...byKey.get(k)!.dependsOn);
    }
    return [...seen];
  };

  for (const task of tasks) {
    const own = verifiedBy(task, parties);
    verified.set(task.key, own);
    const upstream = ancestorsOf(task.key);

    for (const claim of claimsOf(task, parties)) {
      const id = `${claim.party}|${claim.cls}`;
      if (own.has(id) || upstream.some((k) => verified.get(k)?.has(id))) continue;
      task.checklist.unshift(verifyStepText(claim.party, claim.cls));
      own.add(id);
      findings.push({ taskKey: task.key, title: task.title, party: claim.party, capability: claim.cls, excerpt: claim.excerpt });
    }
  }
  return { plan: { ...plan, tasks }, findings };
}

export function capabilityLabel(cls: CapabilityClass): string {
  return LABEL_FOR[cls];
}
