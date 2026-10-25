import { describe, it, expect } from 'vitest';
import { interpretPlanReply } from '../../lib/ai/taskPlan/pipeline';
import { DECISIONS_TITLE, READ_ME_TITLE } from '../../lib/ai/taskPlan/compose';
import { EXPERT_INPUT } from '../fixtures/inputs';

// A hand-written model reply shaped like a good answer for the expert input.
const expertReply = {
  overview: 'A staged plan: prove the timing first, then build, then test with real users, then charge.',
  planFacts: {
    summary: 'PWA that forwards Frontline emails to a parser and sends push alerts.',
    stack: [{ role: 'backend', choice: 'Node on Railway', source: 'input', reason: '', avoid: ['Cloud Function'] }],
    targets: [{ name: 'alert latency', value: '90 seconds', definedIn: 'T1' }],
    constraints: ['Users forward emails; the app never logs in to Frontline for them'],
    mustNotInclude: ["the user's Frontline login"],
    schedule: { startDate: null, deadline: null, hoursPerWeek: null },
  },
  assumptions: [{ text: 'Frontline emails contain a link that opens the job page.', howToVerify: 'Open three real job emails and check for a link.' }],
  gaps: ['Whether Frontline allows automated forwarding under its terms'],
  unknowns: ['Current SMS prices'],
  decisionsNeeded: [{ question: 'Which features are free and which are paid?', options: ['SMS paid', 'Everything paid'], recommended: 'Decide after the beta' }],
  tasks: [
    { key: 'T1', kind: 'validation', title: 'Run the email timing test', priority: 'high', description: 'Measure how long an email takes to arrive.', whyItMatters: 'The whole product depends on speed.', dependsOn: [], effort: { size: 'M', hours: 6 }, checklist: ['Set up a forwarding address', 'Forward 20 real emails', 'Log timestamps'], notes: '', tags: ['validation', 'email'] },
    { key: 'G1', kind: 'decision-gate', title: 'Is alert speed good enough', priority: 'high', description: 'Go/no-go on the timing result.', whyItMatters: 'Stops you building on a weak foundation.', dependsOn: ['T1'], effort: { size: 'S', hours: 1 }, checklist: ['Median alert time is acceptable', 'Worst case is acceptable'], notes: '', tags: ['planning'] },
    { key: 'T2', title: 'Set up the project', priority: 'medium', description: 'Create the app skeleton.', whyItMatters: 'Everything else builds on it.', dependsOn: [], effort: { size: 'S', hours: 3 }, checklist: ['Create the project', 'Deploy a hello page'], notes: 'A PWA (progressive web app) is a website that can be installed like an app.', tags: ['setup'] },
    { key: 'T3', title: 'Build the email parser', priority: 'medium', description: 'Read job details out of forwarded emails.', whyItMatters: 'It is the core feature.', dependsOn: ['G1', 'T2'], effort: { size: 'L', hours: 12 }, checklist: ['Verify the platform exposes a job link', 'Parse date and school', 'Store results', 'Test on 15 real emails'], notes: 'Twilio costs about $0.0079 per message. Compare vendors.', tags: ['parser', 'backend'] },
    { key: 'T4', kind: 'external-wait', title: 'Register an SMS sender', priority: 'low', description: 'Start the sender registration early.', whyItMatters: 'It takes weeks and blocks SMS.', dependsOn: [], effort: { size: 'S', hours: 1 }, waitDays: 14, checklist: ['Submit the registration'], notes: '', tags: ['sms'] },
    { key: 'T5', title: 'Send alerts with SMS backup', priority: 'low', description: 'Push first, SMS if not opened.', whyItMatters: 'Fast alerts are the promise.', dependsOn: ['T3', 'T4'], effort: { size: 'M', hours: 8 }, checklist: ['Send a push', 'Send an SMS fallback'], notes: '', tags: ['alerts'] },
  ],
};

const run = (reply: unknown, over: Partial<{ inputText: string; localDate: string }> = {}) =>
  interpretPlanReply(JSON.stringify(reply), { inputText: EXPERT_INPUT, localDate: '2026-10-26', ...over });

type Card = { title: string; description: string; checklist: string[]; notes: string; tags: string[]; dueDate: string; priority: string };
type Struct = { key: string; title: string; kind: string; priority: string; dependsOn: string[]; dueDate: string };

function body(reply: unknown, over = {}) {
  const r = run(reply, over);
  if (!r.ok) throw new Error('expected ok');
  return r.body as { overview: string; tasks: Card[]; summary: Record<string, unknown>; structure: Struct[]; remaining?: number };
}

describe('interpretPlanReply: full pipeline on a canned reply', () => {
  it('puts the Read-me-first card first, then Decisions, then dependency-ordered plan cards', () => {
    const b = body(expertReply);
    expect(b.tasks[0].title).toBe(READ_ME_TITLE);
    expect(b.tasks[1].title).toBe(DECISIONS_TITLE);
    expect(b.tasks.slice(2).map((c) => c.title)).toContain('Decision: Is alert speed good enough');
    expect(b.tasks).toHaveLength(2 + expertReply.tasks.length);
  });

  it('dates every card, in order: nothing before a prerequisite, the gate strictly after the work it judges', () => {
    const b = body(expertReply);
    for (const c of b.tasks) expect(c.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const due = new Map(b.structure.map((s) => [s.key, s.dueDate]));
    for (const s of b.structure) {
      for (const d of s.dependsOn) {
        expect(due.get(s.key)! >= due.get(d)!).toBe(true);
        if (s.kind === 'decision-gate') expect(due.get(s.key)! > due.get(d)!).toBe(true);
      }
    }
  });

  it('writes "Depends on:" first, then the description, then "Why this matters:"', () => {
    const parser = body(expertReply).tasks.find((c) => c.title === 'Build the email parser')!;
    const lines = parser.description.split('\n');
    expect(lines[0]).toBe('Depends on: Decision: Is alert speed good enough; Set up the project');
    expect(lines[1]).toBe('Read job details out of forwarded emails.');
    expect(lines[2]).toBe('Why this matters: It is the core feature.');
    expect(body(expertReply).tasks.find((c) => c.title === 'Set up the project')!.description.startsWith('Depends on')).toBe(false);
  });

  it('tags the gate card and makes the cards that depend on it say so', () => {
    const b = body(expertReply);
    expect(b.tasks.find((c) => c.title.startsWith('Decision: Is alert'))!.tags).toContain('decision-gate');
    expect(b.tasks.find((c) => c.title === 'Build the email parser')!.description).toContain('Decision: Is alert speed good enough');
  });

  it('raises a prerequisite to the priority of what depends on it (the old medium-shell bug)', () => {
    const b = body(expertReply);
    const parser = b.structure.find((s) => s.key === 'T3')!; // medium in the reply, but T5 depends on it
    const setup = b.structure.find((s) => s.key === 'T2')!;
    const gate = b.structure.find((s) => s.key === 'G1')!;
    // T5 is low, so T3 stays medium; T2 and G1 feed T3 (medium) and are already >= medium.
    expect(parser.priority).toBe('medium');
    expect(setup.priority).toBe('medium');
    expect(gate.priority).toBe('high');
  });

  it('labels an unverified price on a card and lists it on the Read-me card', () => {
    const b = body(expertReply);
    const parser = b.tasks.find((c) => c.title === 'Build the email parser')!;
    expect(parser.notes).toContain('Assumption, verify: Twilio costs about $0.0079 per message.');
    expect(b.summary.specificsLabeled).toBe(1);
    expect(b.tasks[0].checklist.join('\n')).toContain('Twilio costs about $0.0079');
  });

  it('the Read-me card lists every assumption label that appears on the plan cards', () => {
    const b = body(expertReply);
    const readMe = b.tasks[0].checklist.join('\n');
    const labeledOnCards = b.tasks
      .slice(2)
      .flatMap((c) => [...c.description.split('\n'), ...c.notes.split(/(?<=[.!?])\s+/), ...c.checklist])
      .filter((t) => /assumption|unverified/i.test(t));
    expect(labeledOnCards.length).toBeGreaterThan(0);
    for (const text of labeledOnCards) expect(readMe).toContain(text.slice(0, 40));
  });

  it("lists the plan's own assumptions with how to check them, plus gaps and unknowns", () => {
    const readMe = body(expertReply).tasks[0];
    expect(readMe.checklist[0]).toContain('Assumption, verify: Frontline emails contain a link');
    expect(readMe.checklist[0]).toContain('How to check: Open three real job emails');
    expect(readMe.notes).toContain('Whether Frontline allows automated forwarding');
    expect(readMe.notes).toContain('Current SMS prices');
    expect(readMe.description).toContain('starting point and may still have gaps');
    expect(readMe.description).toContain('Moving one is normal');
  });

  it('states the pacing assumption when hours were not given, and uses the stated hours when they were', () => {
    expect(body(expertReply).tasks[0].description).toContain('Pacing assumed: about 10 hours a week');
    const stated = JSON.parse(JSON.stringify(expertReply));
    stated.planFacts.schedule = { startDate: null, deadline: null, hoursPerWeek: 5 };
    expect(body(stated).tasks[0].description).toContain('Pacing used: 5 hours a week');
  });

  it("starts from the user's local date, rolling a Saturday to Monday (not the UTC day)", () => {
    const b = body(expertReply, { localDate: '2026-10-24' }); // Saturday evening in New Jersey
    expect(b.summary.firstWorkingDay).toBe('2026-10-26');
    expect(b.tasks[0].dueDate).toBe('2026-10-26');
  });

  it('uses a later stated start date, but never one in the past', () => {
    const later = JSON.parse(JSON.stringify(expertReply));
    later.planFacts.schedule = { startDate: '2026-11-09', deadline: null, hoursPerWeek: null };
    expect(body(later, { localDate: '2026-10-26' }).summary.firstWorkingDay).toBe('2026-11-09');
    const past = JSON.parse(JSON.stringify(expertReply));
    past.planFacts.schedule = { startDate: '2026-10-01', deadline: null, hoursPerWeek: null };
    expect(body(past, { localDate: '2026-10-26' }).summary.firstWorkingDay).toBe('2026-10-26');
  });

  it('flags a deadline that cannot be met and names what would have to give', () => {
    const tight = JSON.parse(JSON.stringify(expertReply));
    tight.planFacts.schedule = { startDate: null, deadline: '2026-10-30', hoursPerWeek: 10 };
    const b = body(tight);
    expect(b.summary.deadlineMet).toBe(false);
    expect(b.tasks[0].description).toContain('NOT met');
    expect(b.tasks[0].description).toContain('would have to be deferred');
    for (const c of b.tasks) expect(c.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/); // still dated, not crammed or dropped
  });

  it('adds a Decisions card only when there is something to decide', () => {
    const quiet = JSON.parse(JSON.stringify(expertReply));
    quiet.decisionsNeeded = [];
    expect(body(quiet).tasks.some((c) => c.title === DECISIONS_TITLE)).toBe(false);

    const recommended = JSON.parse(JSON.stringify(quiet));
    recommended.planFacts.stack = [{ role: 'payments', choice: 'Stripe', source: 'recommended', reason: 'Widely used and well documented.', avoid: [] }];
    const card = body(recommended).tasks.find((c) => c.title === DECISIONS_TITLE)!;
    expect(card.checklist[0]).toContain('Recommended default for payments: Stripe');
  });

  it('still produces the Read-me card for a trivial plan, and says honestly that nothing was found', () => {
    const trivial = { overview: 'Small job.', tasks: [{ title: 'Add the toggle', description: 'Add a switch in settings.', checklist: ['Add the switch', 'Save the choice'] }] };
    const b = body(trivial, { inputText: 'Add a dark mode toggle' });
    expect(b.tasks).toHaveLength(2); // Read me first + the one task, no Decisions card
    expect(b.tasks[0].title).toBe(READ_ME_TITLE);
    expect(b.tasks[0].checklist[0]).toContain('No unverified prices, rates, links or named communities were found');
  });

  it('rejects malformed and empty replies so a free generation can be released', () => {
    expect(interpretPlanReply('{"overview":"x","tasks":[{"title":"Cut o', { inputText: '', localDate: '2026-10-26' })).toEqual({ ok: false, reason: 'malformed' });
    expect(interpretPlanReply('{"tasks":[]}', { inputText: '', localDate: '2026-10-26' })).toEqual({ ok: false, reason: 'empty' });
  });
});
