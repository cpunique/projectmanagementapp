import { describe, it, expect } from 'vitest';
import { assignPriorities, parsePlanReply } from '../../lib/ai/taskPlan/parse';
import { priorityViolations } from '../../lib/ai/taskPlan/checks';
import { makeTask } from './helpers';
import type { PlanTask } from '../../lib/ai/taskPlan/types';

const highs = (tasks: PlanTask[]) => tasks.filter((t) => t.priority === 'high').length;

describe('assignPriorities', () => {
  it('keeps at most about a third of the cards high, earliest first', () => {
    const tasks = Array.from({ length: 9 }, (_, i) => makeTask({ key: `T${i}`, priority: 'high' }));
    assignPriorities(tasks);
    expect(tasks.map((t) => t.priority)).toEqual([
      'high', 'high', 'high', 'medium', 'medium', 'medium', 'medium', 'medium', 'medium',
    ]);
  });

  it('always allows at least one high card', () => {
    const one = [makeTask({ key: 'A', priority: 'high' })];
    assignPriorities(one);
    expect(one[0].priority).toBe('high');
  });

  it('caps later-phase milestones (beta, launch, paid tier) at medium even when budget remains', () => {
    const tasks = [
      makeTask({ key: 'A', title: 'Build the core', priority: 'high' }),
      makeTask({ key: 'B', title: 'Build the screens', priority: 'low' }),
      makeTask({ key: 'C', title: 'Set up monitoring', priority: 'low' }),
      makeTask({ key: 'D', title: 'Run the private beta', priority: 'high' }),
      makeTask({ key: 'E', title: 'Launch to the public', priority: 'high' }),
      makeTask({ key: 'F', title: 'Build the paid tier with Stripe', priority: 'high' }),
    ];
    assignPriorities(tasks);
    expect(tasks.find((t) => t.key === 'D')!.priority).toBe('medium');
    expect(tasks.find((t) => t.key === 'E')!.priority).toBe('medium');
    expect(tasks.find((t) => t.key === 'F')!.priority).toBe('medium');
  });

  it('does not cap an early "beta" card, such as recruiting testers, just because of the word', () => {
    const tasks = [
      makeTask({ key: 'A', title: 'Recruit beta testers', priority: 'high' }),
      ...Array.from({ length: 5 }, (_, i) => makeTask({ key: `B${i}`, priority: 'low' })),
    ];
    assignPriorities(tasks);
    expect(tasks[0].priority).toBe('high');
  });

  it('meets "a prerequisite is never lower than what depends on it" by lowering dependents', () => {
    const tasks = [
      makeTask({ key: 'shell', priority: 'medium' }),
      makeTask({ key: 'push', priority: 'high', dependsOn: ['shell'] }),
      makeTask({ key: 'beta', title: 'Run the beta', priority: 'high', dependsOn: ['push'] }),
    ];
    assignPriorities(tasks);
    expect(tasks.map((t) => t.priority)).toEqual(['medium', 'medium', 'medium']); // shell was not raised
    expect(priorityViolations(tasks)).toEqual([]);
  });

  it('holds on random plans: no violations, within the high budget, high is a connected block from the start', () => {
    let seed = 12345;
    const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const levels = ['low', 'medium', 'high'] as const;
    for (let round = 0; round < 300; round++) {
      const n = 1 + Math.floor(rand() * 18);
      const tasks = Array.from({ length: n }, (_, i) => {
        const deps = Array.from({ length: i }, (_, j) => j).filter(() => rand() < 0.25).map((j) => `T${j}`);
        return makeTask({ key: `T${i}`, priority: levels[Math.floor(rand() * 3)], dependsOn: deps });
      });
      assignPriorities(tasks);
      expect(priorityViolations(tasks)).toEqual([]);
      expect(highs(tasks)).toBeLessThanOrEqual(Math.max(1, Math.ceil(n / 3)));
      const byKey = new Map(tasks.map((t) => [t.key, t]));
      for (const t of tasks.filter((x) => x.priority === 'high')) {
        for (const d of t.dependsOn) expect(byKey.get(d)!.priority).toBe('high');
      }
    }
  });
});

describe('priorities on the saved expert plan', () => {
  it('a plan like the final expert run no longer comes out almost entirely high', () => {
    // 19 cards in the real run, 17 of them high after the old "raise prerequisites" rule.
    const run = JSON.parse(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('node:fs').readFileSync(require('node:path').join(__dirname, '../fixtures/real-runs/expert-run4.json'), 'utf8')
    );
    const structure = run.response.structure as { key: string; title: string; kind: PlanTask['kind']; priority: PlanTask['priority']; dependsOn: string[] }[];
    expect(structure.filter((s) => s.priority === 'high').length).toBeGreaterThanOrEqual(15);

    // Re-run the new rule on the same plan, starting from "everything the model called high stays high".
    const tasks = structure.map((s) => makeTask({ key: s.key, title: s.title, kind: s.kind, priority: s.priority, dependsOn: s.dependsOn }));
    assignPriorities(tasks);
    expect(highs(tasks)).toBeLessThanOrEqual(Math.ceil(tasks.length / 3));
    expect(priorityViolations(tasks)).toEqual([]);
    for (const t of tasks.filter((x) => /beta|paid|launch/i.test(x.title) && tasks.indexOf(x) >= tasks.length / 2)) {
      expect(t.priority).not.toBe('high');
    }
  });

  it('parsePlanReply applies the rule to a model reply', () => {
    const reply = {
      tasks: Array.from({ length: 6 }, (_, i) => ({ key: `T${i + 1}`, title: `Step ${i + 1}`, priority: 'high', dependsOn: i ? [`T${i}`] : [] })),
    };
    const r = parsePlanReply(JSON.stringify(reply));
    expect(r.ok).toBe(true);
    if (r.ok) expect(highs(r.plan.tasks)).toBe(2);
  });
});
