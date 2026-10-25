import { describe, it, expect } from 'vitest';
import { findSpecifics, labelUnverifiedSpecifics } from '../../lib/ai/taskPlan/checks';
import { dueOrder, replaceKeyReferences } from '../../lib/ai/taskPlan/compose';
import { scheduleTasks, dateOrderViolations } from '../../lib/ai/taskPlan/schedule';
import { buildSystemPrompt } from '../../lib/ai/taskPlan/prompt';
import { interpretPlanReply } from '../../lib/ai/taskPlan/pipeline';
import { makePlan, makeTask } from './helpers';

// Problems found in the first real model run, each pinned by a test.

describe('scanner: stand-ins and instructions to verify are not claims', () => {
  it('does not treat an email-address example or a placeholder domain as a link claim', () => {
    expect(findSpecifics('Generate an address such as userid@in.yourapp.com for each user')).toEqual([]);
    expect(findSpecifics('Use a subdomain (e.g., in.yourapp.com) for inbound mail')).toEqual([]);
    expect(findSpecifics('Try it at example.com first')).toEqual([]);
  });

  it('still catches a real domain stated as fact', () => {
    expect(findSpecifics('Mailgun documents this at documentation.mailgun.com')).toContain('documentation.mailgun.com');
  });

  it('does not label "Check <site>" (an instruction to verify) as an unverified claim', () => {
    const plan = makePlan([makeTask({ key: 'T1', notes: 'Check frontlineeducation.com or contact their support.' })]);
    const { plan: out, findings } = labelUnverifiedSpecifics(plan, '');
    expect(findings).toHaveLength(0);
    expect(out.tasks[0].notes).toBe('Check frontlineeducation.com or contact their support.');
  });

  it('still labels a price even inside a "check ..." sentence', () => {
    const plan = makePlan([makeTask({ key: 'T1', notes: 'Check that SMS costs $0.01 per message.' })]);
    expect(labelUnverifiedSpecifics(plan, '').findings).toHaveLength(1);
  });
});

describe('scheduler: a decision gate is reviewed as soon as it is ready', () => {
  it('does not leave a ready gate waiting behind bigger unrelated work', () => {
    const tasks = [
      makeTask({ key: 'V', kind: 'validation', priority: 'high', effort: { size: 'S', hours: 2 } }),
      makeTask({ key: 'BIG', priority: 'high', effort: { size: 'L', hours: 20 } }),
      makeTask({ key: 'G', kind: 'decision-gate', priority: 'high', effort: { size: 'S', hours: 1 }, dependsOn: ['V'] }),
      makeTask({ key: 'AFTER', priority: 'high', effort: { size: 'S', hours: 2 }, dependsOn: ['G'] }),
    ];
    const r = scheduleTasks(tasks, { startDate: '2026-11-02' }); // 2 h/day
    expect(r.dueDates.V).toBe('2026-11-02');
    expect(r.dueDates.G).toBe('2026-11-03'); // the day after V, ahead of BIG
    expect(r.dueDates.G < r.dueDates.BIG).toBe(true);
    expect(dateOrderViolations(tasks, r.dueDates)).toEqual([]);
  });
});

describe('compose: readable output', () => {
  const plan = makePlan([
    makeTask({ key: 'T1', title: 'Run the timing test' }),
    makeTask({ key: 'T2', title: 'Build the parser', dependsOn: ['T1'] }),
    makeTask({ key: 'T10', title: 'Launch the beta' }),
  ]);

  it('replaces card keys written inside text with the card titles (longest key first)', () => {
    expect(replaceKeyReferences('Use the samples from T2, and see T10 and T1.', plan)).toBe(
      'Use the samples from "Build the parser", and see "Launch the beta" and "Run the timing test".'
    );
  });

  it('leaves text without keys alone and does not touch words that merely contain a key', () => {
    expect(replaceKeyReferences('Nothing to change in AT1X or T11.', plan)).toBe('Nothing to change in AT1X or T11.');
  });

  it('lists cards in due-date order while keeping every prerequisite ahead of its dependents', () => {
    const tasks = [
      makeTask({ key: 'A' }),
      makeTask({ key: 'B', dependsOn: ['A'] }),
      makeTask({ key: 'W', kind: 'external-wait', waitDays: 14 }),
      makeTask({ key: 'C', dependsOn: ['W'] }),
    ];
    const r = scheduleTasks(tasks, { startDate: '2026-11-02' });
    const order = dueOrder(tasks, r.dueDates).map((t) => t.key);
    for (const t of tasks) for (const d of t.dependsOn) expect(order.indexOf(d)).toBeLessThan(order.indexOf(t.key));
    const dates = order.map((k) => r.dueDates[k]);
    expect([...dates].sort()).toEqual(dates);
  });

  it('end to end: no card text shows a raw key and the board order is by due date', () => {
    const reply = {
      overview: 'o',
      tasks: [
        { key: 'T1', title: 'First', description: 'Do it.', effort: { hours: 2 }, checklist: ['a', 'b'] },
        { key: 'T2', title: 'Second', description: 'Uses the output of T1.', dependsOn: ['T1'], effort: { hours: 2 }, checklist: ['a', 'b'], notes: 'See T1.' },
      ],
    };
    const r = interpretPlanReply(JSON.stringify(reply), { inputText: '', localDate: '2026-11-02' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const cards = r.body.tasks as { title: string; description: string; notes: string; dueDate: string }[];
    const text = cards.map((c) => `${c.description} ${c.notes}`).join(' ');
    expect(text).not.toMatch(/\bT[12]\b/);
    expect(text).toContain('"First"');
    const planCards = cards.slice(1);
    expect(planCards.map((c) => c.dueDate)).toEqual([...planCards.map((c) => c.dueDate)].sort());
  });
});

describe('prompt: rules added after the first real run', () => {
  const p = buildSystemPrompt('development');
  it.each([
    'Never refer to a card by its key',
    'Do not explain or restate how a law, regulation, certification, limit or platform rule works',
    'never assume the answer',
    'Prefer adding a checklist item to the most relevant existing card',
    'Be concise.',
    'about a third of the cards at most',
    '"<term>: plain-English meaning"',
  ])('contains: %s', (phrase) => {
    expect(p).toContain(phrase);
  });
});
