import { describe, it, expect } from 'vitest';
import { labelUnverifiedSpecifics } from '../../lib/ai/taskPlan/checks';
import { buildSystemPrompt } from '../../lib/ai/taskPlan/prompt';
import { makePlan, makeTask } from './helpers';

// Problems found in the second real model run.

describe('scanner: an example tool is not a claim', () => {
  const label = (notes: string) =>
    labelUnverifiedSpecifics(makePlan([makeTask({ key: 'T1', notes })]), '').findings.length;

  it('does not label "(e.g. dnschecker.org)", "such as ..." or "for example ..." examples', () => {
    expect(label('Use a DNS checker tool (e.g. dnschecker.org) to confirm the records are live.')).toBe(0);
    expect(label('Use a logging service such as logtail.com for alerts.')).toBe(0);
    expect(label('Pick a host, for example render.com, for the demo.')).toBe(0);
  });

  it('still labels a domain stated as a fact', () => {
    expect(label('The official rules are published at nj.gov/education/rules.')).toBe(1);
  });
});

describe('prompt: interpretation and dependency rules added after run 2', () => {
  const p = buildSystemPrompt('development');
  it.each([
    'do not guess and do not build something different under that name',
    'What exactly does the 20-day limit count?',
    'A milestone card (beta, launch) depends on the core work, not on every optional feature',
    '"gaps" and "unknowns" to at most 5 short lines each',
  ])('contains: %s', (phrase) => {
    expect(p).toContain(phrase);
  });
});
