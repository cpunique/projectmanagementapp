import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { externalParties, insertCapabilityVerifySteps, verifyStepText } from '../../lib/ai/taskPlan/capabilities';
import { interpretPlanReply } from '../../lib/ai/taskPlan/pipeline';
import type { Plan, PlanTask } from '../../lib/ai/taskPlan/types';
import { makePlan, makeTask } from './helpers';

const INPUT = 'Subs forward Frontline emails to a private address, and get a one-tap link to Frontline. Stack: React, Firebase, Stripe.';

describe('insertCapabilityVerifySteps: unit behavior', () => {
  const claimer = (over: Partial<PlanTask> = {}) =>
    makeTask({
      key: 'A',
      title: 'Send alerts',
      description: 'Include a one-tap Frontline link in each alert.',
      checklist: ['Write the sender', 'Test it'],
      ...over,
    });

  it('inserts a "Verify first" step at the top of a card that relies on an outside platform link', () => {
    const plan = makePlan([claimer()]);
    const { plan: out, findings } = insertCapabilityVerifySteps(plan, INPUT);
    expect(out.tasks[0].checklist).toEqual([verifyStepText('Frontline', 'link'), 'Write the sender', 'Test it']);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ taskKey: 'A', party: 'Frontline', capability: 'link' });
    expect(plan.tasks[0].checklist).toEqual(['Write the sender', 'Test it']); // input not mutated
  });

  it('words the step so a beginner can act on it', () => {
    expect(verifyStepText('Frontline', 'link')).toBe(
      'Verify first: Frontline really provides the link this card relies on (check real examples or ask Frontline).'
    );
    expect(verifyStepText('Acme', 'api')).toContain('API or integration');
    expect(verifyStepText('Acme', 'export')).toContain('export or data feed');
  });

  it('leaves a card alone when the claim already carries an assumption label', () => {
    const plan = makePlan([claimer({ description: 'Assumption, verify: Frontline provides a job link in each email.' })]);
    expect(insertCapabilityVerifySteps(plan, INPUT).findings).toHaveLength(0);
  });

  it('leaves a card alone when it already starts by verifying, or only asks a question', () => {
    const verifying = claimer({ checklist: ['Verify that Frontline emails contain a job link', 'Build it'] });
    expect(insertCapabilityVerifySteps(makePlan([verifying]), INPUT).findings).toHaveLength(0);
    const asking = claimer({ description: 'Can you reliably get the Frontline job link from every email?' });
    expect(insertCapabilityVerifySteps(makePlan([asking]), INPUT).findings).toHaveLength(0);
    const negated = claimer({ description: 'Do not depend on any Frontline link; copy the text instead.' });
    expect(insertCapabilityVerifySteps(makePlan([negated]), INPUT).findings).toHaveLength(0);
  });

  it('does not question well-known developer platforms or the plan\'s own stack', () => {
    const stripe = claimer({ description: 'Use the Stripe API to create the charge.' });
    expect(insertCapabilityVerifySteps(makePlan([stripe]), INPUT + ' Charge with Stripe.').findings).toHaveLength(0);

    const ownStack = makePlan([claimer({ description: 'Pull data from the Acme API.' })], {
      facts: {
        summary: '', targets: [], constraints: [], mustNotInclude: [],
        stack: [{ role: 'crm', choice: 'Acme', source: 'input', reason: '', avoid: [] }],
        schedule: { startDate: null, deadline: null, hoursPerWeek: null },
      },
    });
    expect(insertCapabilityVerifySteps(ownStack, 'Sync with Acme').findings).toHaveLength(0);
  });

  it('only the first card in a chain needs the step; later cards inherit the check', () => {
    const a = claimer({ key: 'A' });
    const b = claimer({ key: 'B', title: 'Log alerts', dependsOn: ['A'] });
    const { findings } = insertCapabilityVerifySteps(makePlan([a, b]), INPUT);
    expect(findings.map((f) => f.taskKey)).toEqual(['A']);
  });

  it('an earlier validation card that covers the capability removes the need', () => {
    const validate = makeTask({
      key: 'V', kind: 'validation', title: 'Check the emails',
      checklist: ['Collect 10 real Frontline job emails', 'Note whether each has a Frontline link'],
    });
    const build = claimer({ key: 'A', dependsOn: ['V'] });
    expect(insertCapabilityVerifySteps(makePlan([validate, build]), INPUT).findings).toHaveLength(0);
  });

  it('parallel cards that do not depend on each other each get their own step', () => {
    const { findings } = insertCapabilityVerifySteps(makePlan([claimer({ key: 'A' }), claimer({ key: 'B', title: 'Other' })]), INPUT);
    expect(findings.map((f) => f.taskKey).sort()).toEqual(['A', 'B']);
  });

  it('checking the link does not cover a different capability of the same platform', () => {
    const validate = makeTask({ key: 'V', kind: 'validation', checklist: ['Check the Frontline link exists'] });
    const api = claimer({ key: 'A', dependsOn: ['V'], description: 'Read jobs from the Frontline API.' });
    const { findings } = insertCapabilityVerifySteps(makePlan([validate, api]), INPUT);
    expect(findings).toHaveLength(1);
    expect(findings[0].capability).toBe('api');
  });

  it('does nothing when the description names no outside platform', () => {
    const plan = makePlan([claimer()]);
    const out = insertCapabilityVerifySteps(plan, 'make an app for my customers');
    expect(out.plan).toBe(plan);
    expect(out.findings).toEqual([]);
  });
});

describe('externalParties', () => {
  const empty = makePlan([]);
  it('takes capitalized names from the description, not the first word of a sentence', () => {
    expect(externalParties('Subs forward Frontline emails. Plan: a PWA for New Jersey.', empty)).toContain('Frontline');
    expect(externalParties('Subs forward Frontline emails.', empty)).not.toContain('Subs');
  });
  it('counts a sentence-initial name when it appears more than once', () => {
    expect(externalParties('Frontline sends emails. Frontline has a feed.', empty)).toContain('Frontline');
  });
  it('ignores well-known platforms and months', () => {
    expect(externalParties('Use React and Stripe starting in March.', empty)).toEqual([]);
  });
});

// The saved real model outputs (see tests/fixtures/real-runs): rebuilt into plans, then checked.
type RunFile = {
  input: string;
  response: {
    tasks: { title: string; description: string; checklist: string[]; notes: string; tags: string[] }[];
    structure: { key: string; title: string; kind: PlanTask['kind']; priority: PlanTask['priority']; dependsOn: string[]; effortHours: number; waitDays: number }[];
  };
};

function planFromSavedRun(name: string): { input: string; plan: Plan } {
  const run: RunFile = JSON.parse(readFileSync(join(__dirname, `../fixtures/real-runs/${name}.json`), 'utf8'));
  const cards = new Map(run.response.tasks.map((c) => [c.title, c]));
  const tasks: PlanTask[] = run.response.structure.map((s) => {
    const c = cards.get(s.title)!;
    const lines = c.description.split('\n');
    return {
      key: s.key, kind: s.kind, title: s.title, priority: s.priority,
      description: lines.filter((l) => !l.startsWith('Depends on:') && !l.startsWith('Why this matters:')).join('\n'),
      whyItMatters: (lines.find((l) => l.startsWith('Why this matters:')) ?? '').replace(/^Why this matters:\s*/, ''),
      dependsOn: s.dependsOn, effort: { size: 'M', hours: s.effortHours }, waitDays: s.waitDays,
      checklist: c.checklist, notes: c.notes, tags: c.tags,
    };
  });
  return { input: run.input, plan: makePlan(tasks) };
}

describe('on the saved real outputs', () => {
  it('final expert run: the push-alert card that builds a "one-tap Frontline link" gets the verify step first', () => {
    const { input, plan } = planFromSavedRun('expert-run4');
    const { plan: out, findings } = insertCapabilityVerifySteps(plan, input);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ title: 'Build push notification and SMS alert delivery', party: 'Frontline', capability: 'link' });

    const before = plan.tasks.find((t) => t.title === findings[0].title)!;
    const after = out.tasks.find((t) => t.title === findings[0].title)!;
    expect(after.checklist[0]).toBe(verifyStepText('Frontline', 'link'));
    expect(after.checklist.slice(1)).toEqual(before.checklist); // nothing else about the card changed
    // no other card was touched
    out.tasks.filter((t) => t.title !== findings[0].title).forEach((t, i) => {
      expect(t.checklist).toEqual(plan.tasks.filter((p) => p.title !== findings[0].title)[i].checklist);
    });
  });

  it('first expert run: no step is added, because an earlier "Validate" card already checks the link', () => {
    const { input, plan } = planFromSavedRun('expert-run1');
    expect(plan.tasks.some((t) => /Frontline job link/i.test(t.checklist.join(' ')))).toBe(true); // there are claims
    expect(insertCapabilityVerifySteps(plan, input).findings).toEqual([]);
  });

  it.each(['novice', 'trivial', 'conflict', 'renovation', 'startHours', 'tight', 'event', 'docs', 'research'])(
    '%s: names no outside platform, so nothing is added',
    (name) => {
      const { input, plan } = planFromSavedRun(name);
      expect(insertCapabilityVerifySteps(plan, input).findings).toEqual([]);
    }
  );
});

describe('in the pipeline', () => {
  const reply = {
    overview: 'o',
    tasks: [
      { key: 'T1', title: 'Send alerts', description: 'Include a one-tap Frontline link in each alert.', effort: { hours: 4 }, checklist: ['Write the sender', 'Test it'] },
    ],
  };

  it('adds the step, lists the card on Read me first, and counts it in the summary and flags', () => {
    const r = interpretPlanReply(JSON.stringify(reply), { inputText: INPUT, localDate: '2026-11-02' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const cards = r.body.tasks as { title: string; checklist: string[] }[];
    expect(cards[0].title).toBe('Read me first: assumptions and gaps');
    expect(cards[0].checklist.join('\n')).toContain('On "Send alerts": it relies on Frontline\'s link, and nobody has checked it exists. A "Verify first" step was added');
    const alerts = cards.find((c) => c.title === 'Send alerts')!;
    expect(alerts.checklist[0]).toBe(verifyStepText('Frontline', 'link'));
    const summary = r.body.summary as { capabilityVerifyStepsAdded: number; flags: { type: string }[] };
    expect(summary.capabilityVerifyStepsAdded).toBe(1);
    expect(summary.flags.some((f) => f.type === 'unverified-capability')).toBe(true);
  });

  it('adds nothing and says nothing extra when the description names no outside platform', () => {
    const r = interpretPlanReply(JSON.stringify(reply), { inputText: 'make an app for my customers', localDate: '2026-11-02' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect((r.body.summary as { capabilityVerifyStepsAdded: number }).capabilityVerifyStepsAdded).toBe(0);
  });
});
