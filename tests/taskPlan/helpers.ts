import type { Plan, PlanTask } from '../../lib/ai/taskPlan/types';

export function makeTask(overrides: Partial<PlanTask> & { key: string }): PlanTask {
  return {
    kind: 'work',
    title: `Task ${overrides.key}`,
    priority: 'medium',
    description: 'Do the thing.',
    whyItMatters: 'It matters.',
    dependsOn: [],
    effort: { size: 'M', hours: 6 },
    waitDays: 0,
    checklist: ['Step one', 'Step two'],
    notes: '',
    tags: ['build'],
    ...overrides,
  };
}

export function makePlan(tasks: PlanTask[], overrides: Partial<Plan> = {}): Plan {
  return {
    overview: 'Overview.',
    facts: {
      summary: '',
      stack: [],
      targets: [],
      constraints: [],
      mustNotInclude: [],
      schedule: { startDate: null, deadline: null, hoursPerWeek: null },
    },
    assumptions: [],
    gaps: [],
    decisionsNeeded: [],
    tasks,
    ...overrides,
  };
}
