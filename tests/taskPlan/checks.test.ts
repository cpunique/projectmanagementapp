import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ASSUMPTION_LABEL,
  checkPlan,
  findSpecifics,
  labelUnverifiedSpecifics,
} from '../../lib/ai/taskPlan/checks';
import { EXPERT_INPUT } from '../fixtures/inputs';
import { makePlan, makeTask } from './helpers';

describe('findSpecifics: recognizes the kinds of specific claims', () => {
  it.each([
    ['SMS price', 'Twilio SMS costs roughly $0.0079/message', '$0.0079'],
    ['free-tier quota', 'Mailgun inbound parse is free up to 100 messages/day for testing', '100 messages/day'],
    ['named subreddit', 'Recruit from Reddit (r/njteachers)', 'r/njteachers'],
    ['monthly price range', 'Pricing suggestion: $7-9/month', '$7-9'],
    ['URL', 'See https://example.com/pricing for details', 'https://example.com/pricing'],
    ['percentage', 'Aim for 99.9% uptime', '99.9%'],
    ['currency in words', 'It costs 20 USD per seat', '20 USD'],
    ['bare domain with path', 'Open firebase.google.com/docs/messaging', 'firebase.google.com/docs/messaging'],
  ])('%s', (_name, text, expected) => {
    expect(findSpecifics(text)).toContain(expected);
  });

  it('does not flag ordinary text, versions, or file names', () => {
    expect(findSpecifics('Set up the React app with Vite and a manifest.json file')).toEqual([]);
    expect(findSpecifics('Run the test with 20 real emails and log the timestamps')).toEqual([]);
    expect(findSpecifics('Make it 100% offline')).toEqual([]);
  });
});

describe('labelUnverifiedSpecifics', () => {
  const task = (over = {}) =>
    makeTask({ key: 'T1', title: 'Pick an SMS provider', ...over });

  it('prefixes a sentence that states a specific price as fact', () => {
    const plan = makePlan([task({ notes: 'Twilio costs about $0.0079 per message. Compare two other vendors too.' })]);
    const { plan: out, findings } = labelUnverifiedSpecifics(plan, 'build an app');
    expect(out.tasks[0].notes).toBe(
      `${ASSUMPTION_LABEL} Twilio costs about $0.0079 per message. Compare two other vendors too.`
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ taskKey: 'T1', field: 'notes', autoLabeled: true });
  });

  it('labels checklist items individually', () => {
    const plan = makePlan([task({ checklist: ['Check the vendor page', 'Budget $50/month for it'] })]);
    const { plan: out } = labelUnverifiedSpecifics(plan, '');
    expect(out.tasks[0].checklist).toEqual(['Check the vendor page', `${ASSUMPTION_LABEL} Budget $50/month for it`]);
  });

  it('leaves already-labeled text alone (no double labels)', () => {
    const plan = makePlan([task({ notes: 'Assumption, verify: Twilio costs about $0.0079 per message.' })]);
    const { plan: out, findings } = labelUnverifiedSpecifics(plan, '');
    expect(out.tasks[0].notes).toBe('Assumption, verify: Twilio costs about $0.0079 per message.');
    expect(findings).toHaveLength(0);
  });

  it('does not touch specifics the user supplied themselves', () => {
    const plan = makePlan([task({ description: 'Keep the price at $15/month as you said.' })]);
    const { findings } = labelUnverifiedSpecifics(plan, 'I want to charge $15/month');
    expect(findings).toHaveLength(0);
  });

  it('reports a specific in a title without rewriting the title', () => {
    const plan = makePlan([task({ title: 'Launch at $9/month' })]);
    const { plan: out, findings } = labelUnverifiedSpecifics(plan, '');
    expect(out.tasks[0].title).toBe('Launch at $9/month');
    expect(findings[0]).toMatchObject({ field: 'title', autoLabeled: false });
  });

  it('does not mutate the plan it was given', () => {
    const plan = makePlan([task({ notes: 'It costs $5.' })]);
    labelUnverifiedSpecifics(plan, '');
    expect(plan.tasks[0].notes).toBe('It costs $5.');
  });
});

describe('scanner against the real pre-change fixture output', () => {
  const fixture = JSON.parse(readFileSync(join(__dirname, '../fixtures/Sub_Pro_2026-10-25.json'), 'utf8'));
  type FixtureCard = { title: string; description: string; notes: string; checklist: { text: string }[] };
  const cards: FixtureCard[] = fixture.boards[0].columns.flatMap((c: { cards: FixtureCard[] }) => c.cards);
  const plan = makePlan(
    cards.map((c, i) =>
      makeTask({
        key: `T${i + 1}`,
        title: c.title,
        description: c.description,
        notes: c.notes,
        checklist: c.checklist.map((x: { text: string }) => x.text),
      })
    )
  );
  const { findings } = labelUnverifiedSpecifics(plan, EXPERT_INPUT);
  const found = findings.flatMap((f) => f.specifics).join(' | ');

  it('catches the unverified price, quota, community and monthly price the old output stated as fact', () => {
    expect(found).toContain('$0.0079');
    expect(found).toContain('100 messages/day');
    expect(found).toContain('r/njteachers');
    expect(found).toContain('$7-9');
  });
});

describe('checkPlan', () => {
  it('flags a card that mentions something the plan says not to use, but not a negated mention', () => {
    const plan = makePlan(
      [
        makeTask({ key: 'A', title: 'Send alerts', description: 'Deploy the sender as a Cloud Function.' }),
        makeTask({ key: 'B', title: 'Parser', description: 'Run it on Railway, not as a Cloud Function.' }),
      ],
      {
        facts: {
          summary: '',
          stack: [{ role: 'backend', choice: 'Node on Railway', source: 'input', reason: '', avoid: ['Cloud Function'] }],
          targets: [],
          constraints: [],
          mustNotInclude: [],
          schedule: { startDate: null, deadline: null, hoursPerWeek: null },
        },
      }
    );
    const flags = checkPlan(plan).filter((f) => f.type === 'conflict-with-constraint');
    expect(flags.map((f) => f.taskKey)).toEqual(['A']);
  });

  it('flags a target repeated outside the card that defines it', () => {
    const plan = makePlan(
      [
        makeTask({ key: 'A', description: 'Measure it. The latency target is 90 seconds.' }),
        makeTask({ key: 'B', description: 'Make sure alerts arrive within 90 seconds.' }),
      ],
      {
        facts: {
          summary: '',
          stack: [],
          targets: [{ name: 'alert latency', value: '90 seconds', definedIn: 'A' }],
          constraints: [],
          mustNotInclude: [],
          schedule: { startDate: null, deadline: null, hoursPerWeek: null },
        },
      }
    );
    expect(checkPlan(plan).filter((f) => f.type === 'target-redefined').map((f) => f.taskKey)).toEqual(['B']);
  });

  it('flags an assumption-bearing work card whose first step is not a check', () => {
    const bad = makeTask({ key: 'A', notes: 'Assumption, verify: the platform offers a deep link.', checklist: ['Build the link', 'Test it'] });
    const good = makeTask({ key: 'B', notes: 'Assumption, verify: the platform offers a deep link.', checklist: ['Verify the platform offers a deep link', 'Build it'] });
    const flags = checkPlan(makePlan([bad, good])).filter((f) => f.type === 'verify-first');
    expect(flags.map((f) => f.taskKey)).toEqual(['A']);
  });

  it('flags uniform checklist lengths, oversized checklists and oversized estimates', () => {
    const uniform = ['A', 'B', 'C', 'D'].map((key) => makeTask({ key, checklist: ['1', '2', '3', '4', '5'] }));
    expect(checkPlan(makePlan(uniform)).some((f) => f.type === 'checklist-uniform')).toBe(true);

    const varied = [
      makeTask({ key: 'A', checklist: ['1', '2'] }),
      makeTask({ key: 'B', checklist: ['1', '2', '3'] }),
      makeTask({ key: 'C', checklist: Array.from({ length: 9 }, (_, i) => String(i)), effort: { size: 'L', hours: 30 } }),
      makeTask({ key: 'D', checklist: ['1', '2', '3', '4'] }),
    ];
    const flags = checkPlan(makePlan(varied));
    expect(flags.some((f) => f.type === 'checklist-uniform')).toBe(false);
    expect(flags.some((f) => f.type === 'checklist-oversized' && f.taskKey === 'C')).toBe(true);
    expect(flags.some((f) => f.type === 'effort-oversized' && f.taskKey === 'C')).toBe(true);
  });
});
