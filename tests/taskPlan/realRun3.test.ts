import { describe, it, expect } from 'vitest';
import { checkPlan, labelUnverifiedSpecifics } from '../../lib/ai/taskPlan/checks';
import { collectLabeledItems } from '../../lib/ai/taskPlan/compose';
import { makePlan, makeTask } from './helpers';

// Problems found in the third real model run (the novice input).

describe('scanner: where-to-go instructions are not claims', () => {
  const findings = (item: string) =>
    labelUnverifiedSpecifics(makePlan([makeTask({ key: 'T1', checklist: [item] })]), '').findings.length;

  it.each([
    'Create a free Supabase account at supabase.com',
    'Install VS Code (code editor) from code.visualstudio.com',
    'Go to stripe.com and check the list of supported countries',
    'Download Node.js from nodejs.org and choose the LTS version',
  ])('does not label: %s', (item) => {
    expect(findings(item)).toBe(0);
  });

  it('still labels a price or quota inside an instruction, and a domain stated as a fact', () => {
    expect(findings('Create an account, then budget $25/month for it')).toBe(1);
    expect(findings('Stripe takes 2.9% of each payment')).toBe(1);
    expect(findings('The limits are listed at vendor.io/limits')).toBe(1);
  });
});

describe('"Why this matters" lines are scanned and summarized too', () => {
  it('labels an unverified specific in the why-it-matters line', () => {
    const plan = makePlan([makeTask({ key: 'T1', whyItMatters: 'Registration costs $40 and takes weeks.' })]);
    const { plan: out, findings } = labelUnverifiedSpecifics(plan, '');
    expect(out.tasks[0].whyItMatters).toBe('Assumption, verify: Registration costs $40 and takes weeks.');
    expect(findings[0]).toMatchObject({ field: 'whyItMatters', autoLabeled: true });
  });

  it('includes labeled why-it-matters sentences in the Read-me collection', () => {
    const tasks = [makeTask({ key: 'T1', title: 'Pay the fee', whyItMatters: 'Check with a professional before filing.' })];
    expect(collectLabeledItems(tasks)).toEqual([{ cardTitle: 'Pay the fee', text: 'Check with a professional before filing.' }]);
  });

  it('counts a label in the why-it-matters line when deciding a card needs a verify-first step', () => {
    const plan = makePlan([makeTask({ key: 'T1', whyItMatters: 'Assumption, verify: the vendor supports this.', checklist: ['Build it', 'Ship it'] })]);
    expect(checkPlan(plan).some((f) => f.type === 'verify-first')).toBe(true);
  });
});
