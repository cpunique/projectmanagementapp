import { describe, it, expect } from 'vitest';
import { dateOrderViolations, scheduleTasks, DEFAULT_HOURS_PER_WEEK } from '../../lib/ai/taskPlan/schedule';
import { makeTask } from './helpers';
import type { PlanTask } from '../../lib/ai/taskPlan/types';

// 2026-11-02 is a Monday; 2026-10-24 is a Saturday.
const MON = '2026-11-02';

const chain = (): PlanTask[] => [
  makeTask({ key: 'A', effort: { size: 'M', hours: 6 } }),
  makeTask({ key: 'B', effort: { size: 'M', hours: 6 }, dependsOn: ['A'] }),
  makeTask({ key: 'C', effort: { size: 'M', hours: 6 }, dependsOn: ['B'] }),
];

describe('pacing', () => {
  it('spreads work over business days at the weekly capacity (10 h/week = 2 h/day)', () => {
    const r = scheduleTasks(chain(), { startDate: MON });
    expect(r.dueDates).toEqual({ A: '2026-11-04', B: '2026-11-09', C: '2026-11-12' });
    expect(r.hoursPerWeek).toBe(DEFAULT_HOURS_PER_WEEK);
    expect(r.hoursPerWeekAssumed).toBe(true);
  });

  it('honors a stated weekly capacity and says it was not assumed', () => {
    const slow = scheduleTasks(chain(), { startDate: MON, hoursPerWeek: 5 });
    expect(slow.hoursPerWeekAssumed).toBe(false);
    expect(slow.dueDates.A).toBe('2026-11-09'); // 6 h at 1 h/day
    expect(slow.endDate > scheduleTasks(chain(), { startDate: MON }).endDate).toBe(true);
  });

  it('starts on the next business day when the start date is a weekend', () => {
    const r = scheduleTasks(chain(), { startDate: '2026-10-24' });
    expect(r.firstWorkingDay).toBe('2026-10-26');
    expect(r.dueDates.A).toBe('2026-10-28');
  });

  it('never stacks a day beyond capacity: a small card after a big one is not due the same day it could not fit', () => {
    const tasks = [
      makeTask({ key: 'A', effort: { size: 'S', hours: 2 } }),
      makeTask({ key: 'B', effort: { size: 'S', hours: 2 }, dependsOn: ['A'] }),
    ];
    const r = scheduleTasks(tasks, { startDate: MON }); // 2 h/day
    expect(r.dueDates).toEqual({ A: '2026-11-02', B: '2026-11-03' });
  });

  it('gives every card a due date on or after the first working day', () => {
    const r = scheduleTasks(chain(), { startDate: MON });
    for (const d of Object.values(r.dueDates)) expect(d >= r.firstWorkingDay).toBe(true);
  });

  it('is independent of the machine time zone (pure date strings)', () => {
    const a = scheduleTasks(chain(), { startDate: MON });
    const original = process.env.TZ;
    process.env.TZ = 'Pacific/Auckland';
    const b = scheduleTasks(chain(), { startDate: MON });
    process.env.TZ = original;
    expect(b.dueDates).toEqual(a.dueDates);
  });
});

describe('waiting steps and decision gates', () => {
  it('runs waiting time in parallel with other work and holds only its dependents', () => {
    const tasks = [
      makeTask({ key: 'W', kind: 'external-wait', effort: { size: 'S', hours: 1 }, waitDays: 14 }),
      makeTask({ key: 'A', effort: { size: 'M', hours: 6 } }),
      makeTask({ key: 'B', effort: { size: 'M', hours: 6 }, dependsOn: ['W'] }),
    ];
    const r = scheduleTasks(tasks, { startDate: MON });
    expect(r.dueDates.W).toBe('2026-11-16'); // kickoff 2 Nov + 14 calendar days
    expect(r.dueDates.A < r.dueDates.W).toBe(true); // other work happens during the wait
    expect(r.dueDates.B >= r.dueDates.W).toBe(true);
    expect(dateOrderViolations(tasks, r.dueDates)).toEqual([]);
  });

  it('puts a decision gate strictly after the work it judges, and dependent work after the gate', () => {
    const tasks = [
      makeTask({ key: 'A', effort: { size: 'M', hours: 6 } }),
      makeTask({ key: 'G', kind: 'decision-gate', effort: { size: 'S', hours: 1 }, dependsOn: ['A'] }),
      makeTask({ key: 'B', effort: { size: 'S', hours: 2 }, dependsOn: ['G'] }),
    ];
    const r = scheduleTasks(tasks, { startDate: MON });
    expect(r.dueDates.G > r.dueDates.A).toBe(true);
    expect(r.dueDates.B >= r.dueDates.G).toBe(true);
    expect(dateOrderViolations(tasks, r.dueDates)).toEqual([]);
  });

  it('detects a violation when dates are out of order', () => {
    const tasks = [makeTask({ key: 'A' }), makeTask({ key: 'G', kind: 'decision-gate', dependsOn: ['A'] }), makeTask({ key: 'B', dependsOn: ['A'] })];
    const bad = { A: '2026-11-05', G: '2026-11-05', B: '2026-11-04' };
    expect(dateOrderViolations(tasks, bad).map((v) => `${v.taskKey}:${v.reason}`).sort()).toEqual([
      'B:before-prerequisite',
      'G:gate-not-after',
    ]);
  });
});

describe('deadlines', () => {
  it('reports a deadline that is met', () => {
    const r = scheduleTasks(chain(), { startDate: MON, deadline: '2026-11-12' });
    expect(r.deadlineMet).toBe(true);
    expect(r.wouldHaveToGive).toBeUndefined();
  });

  it('flags a deadline that cannot be met, still dates every card, and shows what would have to give', () => {
    const r = scheduleTasks(chain(), { startDate: MON, deadline: '2026-11-06' });
    expect(r.deadlineMet).toBe(false);
    expect(r.overrunBusinessDays).toBeGreaterThan(0);
    expect(Object.keys(r.dueDates).sort()).toEqual(['A', 'B', 'C']); // not silently crammed or dropped
    expect(r.dueDates.C).toBe('2026-11-12'); // dates stay honest: past the deadline
    expect(r.fitsAfterDeferring).toBe(true);
    expect(r.wouldHaveToGive!.map((d) => d.taskKey)).toEqual(['C', 'B']);
  });

  it('says so when even deferring every optional card cannot meet the deadline', () => {
    const tasks = [makeTask({ key: 'A', effort: { size: 'L', hours: 30 } })];
    const r = scheduleTasks(tasks, { startDate: MON, deadline: '2026-11-03' });
    expect(r.deadlineMet).toBe(false);
    expect(r.fitsAfterDeferring).toBe(false);
  });

  it('reports no deadline status when none was given', () => {
    expect(scheduleTasks(chain(), { startDate: MON }).deadlineMet).toBeNull();
  });
});

// A plan shaped like the expert fixture (timing test, parser, private beta, paid tier),
// with the dependencies the old flat output lost.
describe('expert-fixture-shaped plan: dependency-safe dates', () => {
  const t = (key: string, over: Partial<PlanTask>): PlanTask => makeTask({ key, title: key, ...over });
  const plan: PlanTask[] = [
    t('timing-test', { kind: 'validation', effort: { size: 'M', hours: 6 } }),
    t('gate-latency', { kind: 'decision-gate', effort: { size: 'S', hours: 1 }, dependsOn: ['timing-test'] }),
    t('firebase', { effort: { size: 'S', hours: 3 } }),
    t('app-shell', { effort: { size: 'L', hours: 14 }, dependsOn: ['firebase'] }),
    t('parser', { effort: { size: 'L', hours: 14 }, dependsOn: ['gate-latency', 'firebase'] }),
    t('matching', { effort: { size: 'M', hours: 8 }, dependsOn: ['parser'] }),
    t('push', { effort: { size: 'M', hours: 8 }, dependsOn: ['app-shell', 'matching'] }),
    t('sms-registration', { kind: 'external-wait', effort: { size: 'S', hours: 1 }, waitDays: 14 }),
    t('sms-backup', { effort: { size: 'S', hours: 4 }, dependsOn: ['push', 'sms-registration'] }),
    t('feed-health', { effort: { size: 'M', hours: 6 }, dependsOn: ['parser'] }),
    t('recruit-testers', { kind: 'external-wait', effort: { size: 'S', hours: 2 }, waitDays: 10 }),
    t('private-beta', { effort: { size: 'M', hours: 6 }, dependsOn: ['push', 'feed-health', 'recruit-testers'] }),
    t('gate-continue', { kind: 'decision-gate', effort: { size: 'S', hours: 1 }, dependsOn: ['private-beta'] }),
    t('stripe', { effort: { size: 'M', hours: 8 }, dependsOn: ['gate-continue'] }),
  ];

  it('dates every card with no card due before a prerequisite and both gates after the work they judge', () => {
    const r = scheduleTasks(plan, { startDate: MON });
    expect(Object.keys(r.dueDates)).toHaveLength(plan.length);
    expect(dateOrderViolations(plan, r.dueDates)).toEqual([]);
    expect(r.dueDates['gate-latency'] > r.dueDates['timing-test']).toBe(true);
    expect(r.dueDates['gate-continue'] > r.dueDates['private-beta']).toBe(true);
    expect(r.dueDates.stripe >= r.dueDates['gate-continue']).toBe(true);
  });

  it('starts the long-lead waiting steps first so they run alongside the build', () => {
    const r = scheduleTasks(plan, { startDate: MON });
    // Kickoff happens in the first days, so the wait finishes well before the plan does.
    expect(r.dueDates['sms-registration'] < r.endDate).toBe(true);
    expect(r.dueDates['sms-registration'] <= '2026-11-20').toBe(true);
  });

  it('honors a stated start date and weekly hours', () => {
    const r = scheduleTasks(plan, { startDate: '2026-12-07', hoursPerWeek: 20 });
    expect(r.firstWorkingDay).toBe('2026-12-07');
    expect(r.hoursPerWeekAssumed).toBe(false);
    expect(Object.values(r.dueDates).every((d) => d >= '2026-12-07')).toBe(true);
    expect(r.endDate < scheduleTasks(plan, { startDate: '2026-12-07', hoursPerWeek: 10 }).endDate).toBe(true);
  });
});
