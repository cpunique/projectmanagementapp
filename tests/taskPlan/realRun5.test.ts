import { describe, it, expect } from 'vitest';
import { checkPlan } from '../../lib/ai/taskPlan/checks';
import { parsePlanReply } from '../../lib/ai/taskPlan/parse';
import { interpretPlanReply } from '../../lib/ai/taskPlan/pipeline';
import { scheduleTasks } from '../../lib/ai/taskPlan/schedule';
import { makePlan, makeTask } from './helpers';

// Problems found in the later real runs (conflicting constraints, tight deadline, event, renovation).

const MON = '2026-11-02';
const chain = (priority: 'high' | 'medium' | 'low' = 'medium') => [
  makeTask({ key: 'A', priority, effort: { size: 'M', hours: 6 } }),
  makeTask({ key: 'B', priority, effort: { size: 'M', hours: 6 }, dependsOn: ['A'] }),
  makeTask({ key: 'C', priority, effort: { size: 'M', hours: 6 }, dependsOn: ['B'] }),
];

describe('deadline that cannot be met: say how big the gap is', () => {
  it('reports the hours that fit, and the weekly hours that would be needed', () => {
    const r = scheduleTasks(chain(), { startDate: MON, deadline: '2026-11-06' }); // 5 business days at 2 h/day
    expect(r.hoursAvailableByDeadline).toBe(10);
    expect(r.totalHours).toBe(18);
    expect(r.hoursPerWeekNeeded).toBe(18);
  });

  it('counts a weekend deadline as the Friday before it, not the Monday after', () => {
    const r = scheduleTasks(chain(), { startDate: MON, deadline: '2026-11-08' }); // Sunday
    expect(r.hoursAvailableByDeadline).toBe(10);
  });

  it('never offers to drop high-priority cards or decision gates', () => {
    const allHigh = scheduleTasks(chain('high'), { startDate: MON, deadline: '2026-11-04' });
    expect(allHigh.wouldHaveToGive).toEqual([]);
    expect(allHigh.fitsAfterDeferring).toBe(false);

    const withGate = [
      makeTask({ key: 'A', priority: 'high', effort: { size: 'M', hours: 6 } }),
      makeTask({ key: 'G', kind: 'decision-gate', priority: 'low', effort: { size: 'S', hours: 1 }, dependsOn: ['A'] }),
    ];
    expect(scheduleTasks(withGate, { startDate: MON, deadline: '2026-11-03' }).wouldHaveToGive).toEqual([]);
  });

  it('does still offer a medium or low optional card', () => {
    const tasks = [
      makeTask({ key: 'CORE', priority: 'high', effort: { size: 'M', hours: 6 } }),
      makeTask({ key: 'EXTRA', priority: 'low', effort: { size: 'M', hours: 6 } }),
    ];
    const r = scheduleTasks(tasks, { startDate: MON, deadline: '2026-11-04' }); // 6 h fit
    expect(r.fitsAfterDeferring).toBe(true);
    expect(r.wouldHaveToGive!.map((d) => d.taskKey)).toEqual(['EXTRA']);
  });

  it('the Read-me card explains the gap in hours instead of listing most of the plan', () => {
    const reply = {
      planFacts: { schedule: { startDate: null, deadline: '2026-11-03', hoursPerWeek: 10 } },
      tasks: [
        { key: 'T1', title: 'Core build', priority: 'high', effort: { hours: 12 }, checklist: ['a', 'b'] },
        { key: 'T2', title: 'Polish', priority: 'low', dependsOn: [], effort: { hours: 4 }, checklist: ['a', 'b'] },
      ],
    };
    const r = interpretPlanReply(JSON.stringify(reply), { inputText: '', localDate: MON });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const readMe = (r.body.tasks as { title: string; description: string }[])[0].description;
    expect(readMe).toContain('NOT met at 10 hours a week');
    expect(readMe).toMatch(/About \d+(\.\d+)? hours of work fit before then; the plan needs about 16/);
    expect(readMe).toMatch(/Meeting it would take about \d+ hours a week/);
    expect(readMe).not.toContain('"Core build"'); // the goal is never offered up for dropping
  });
});

describe('checks and tags', () => {
  it('does not flag a figure the person gave themselves for being repeated', () => {
    const plan = makePlan(
      [makeTask({ key: 'A', description: 'Define the guest list.' }), makeTask({ key: 'B', description: 'Pick a venue that seats 60 people.' })],
      {
        facts: {
          summary: '', stack: [], constraints: [], mustNotInclude: [],
          targets: [{ name: 'headcount', value: '60 people', definedIn: 'A' }],
          schedule: { startDate: null, deadline: null, hoursPerWeek: null },
        },
      }
    );
    expect(checkPlan(plan, 'Plan a 60 people retirement party').some((f) => f.type === 'target-redefined')).toBe(false);
    expect(checkPlan(plan, 'Plan a party').some((f) => f.type === 'target-redefined')).toBe(true);
  });

  it('strips a reserved tag from a card of a different kind', () => {
    const r = parsePlanReply(
      JSON.stringify({
        tasks: [
          { key: 'T1', title: 'Repair walls', kind: 'work', tags: ['decision-gate', 'validation', 'repairs'] },
          { key: 'T2', title: 'Decision: go', kind: 'decision-gate', tags: ['planning'] },
        ],
      })
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plan.tasks[0].tags).toEqual(['repairs']);
    expect(r.plan.tasks[1].tags).toContain('decision-gate');
  });
});
