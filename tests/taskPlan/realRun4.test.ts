import { describe, it, expect } from 'vitest';
import { checkPlan } from '../../lib/ai/taskPlan/checks';
import { dateOrderViolations, scheduleTasks } from '../../lib/ai/taskPlan/schedule';
import { makePlan, makeTask } from './helpers';

// Problems found in the fourth real model run.

describe('scheduler: a decision gate interrupts busy work', () => {
  // A waiting step ends on Mon 9 Nov; meanwhile the person is deep in a 20-hour build.
  const tasks = [
    makeTask({ key: 'W', kind: 'external-wait', effort: { size: 'S', hours: 1 }, waitDays: 7 }),
    makeTask({ key: 'X', effort: { size: 'L', hours: 20 } }),
    makeTask({ key: 'G', kind: 'decision-gate', effort: { size: 'S', hours: 1 }, dependsOn: ['W'] }),
    makeTask({ key: 'AFTER', effort: { size: 'S', hours: 2 }, dependsOn: ['G'] }),
  ];
  const r = scheduleTasks(tasks, { startDate: '2026-11-02' }); // 2 h/day

  it('reviews the day after the work it judges, even while the person is busy with something else', () => {
    expect(r.dueDates.W).toBe('2026-11-09');
    expect(r.dueDates.G).toBe('2026-11-10'); // not queued behind the 20-hour build
    expect(r.dueDates.X > r.dueDates.G).toBe(true); // the build is still running when the review happens
    expect(dateOrderViolations(tasks, r.dueDates)).toEqual([]);
  });

  it('still counts the review hours, so later work is pushed back rather than overbooked', () => {
    const withoutGate = scheduleTasks(
      [tasks[0], tasks[1], makeTask({ key: 'AFTER', effort: { size: 'S', hours: 2 }, dependsOn: ['W'] })],
      { startDate: '2026-11-02' }
    );
    expect(r.endDate >= withoutGate.endDate).toBe(true);
    expect(r.dueDates.AFTER >= r.dueDates.G).toBe(true);
  });
});

describe('checks: fewer false alarms', () => {
  const target = { name: 'alert delay', value: '90 seconds', definedIn: 'A' };
  const facts = {
    summary: '', stack: [], targets: [target], constraints: [], mustNotInclude: [],
    schedule: { startDate: null, deadline: null, hoursPerWeek: null },
  };

  it('lets a decision gate restate the target it judges, but not an ordinary card', () => {
    const plan = makePlan(
      [
        makeTask({ key: 'A', description: 'Measure it. Target: 90 seconds.' }),
        makeTask({ key: 'G', kind: 'decision-gate', title: 'Decision: fast enough', checklist: ['Median is under 90 seconds'] }),
        makeTask({ key: 'B', description: 'Alerts must arrive within 90 seconds.' }),
      ],
      { facts }
    );
    expect(checkPlan(plan).filter((f) => f.type === 'target-redefined').map((f) => f.taskKey)).toEqual(['B']);
  });

  it('does not ask for a verify-first step just because a card says "check with a professional"', () => {
    const advice = makeTask({ key: 'A', checklist: ['Write the policy', 'Check with a professional about what it must cover'] });
    expect(checkPlan(makePlan([advice])).some((f) => f.type === 'verify-first')).toBe(false);
    const assumption = makeTask({ key: 'B', notes: 'Assumption, verify: the vendor allows this.', checklist: ['Build it', 'Ship it'] });
    expect(checkPlan(makePlan([assumption])).some((f) => f.type === 'verify-first')).toBe(true);
  });
});
