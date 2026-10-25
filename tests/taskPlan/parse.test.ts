import { describe, it, expect } from 'vitest';
import { parsePlanReply, orderTasks, propagatePriority, normalizeTags } from '../../lib/ai/taskPlan/parse';
import { dependencyOrderViolations, priorityViolations } from '../../lib/ai/taskPlan/checks';
import { makeTask } from './helpers';

const reply = (obj: unknown) => JSON.stringify(obj);

describe('parsePlanReply: reading the model reply', () => {
  it('accepts a reply wrapped in code fences or in a sentence', () => {
    const body = { overview: 'o', tasks: [{ title: 'A' }] };
    expect(parsePlanReply('```json\n' + reply(body) + '\n```').ok).toBe(true);
    expect(parsePlanReply('Here is the plan: ' + reply(body) + ' Hope it helps!').ok).toBe(true);
  });

  it('rejects garbage and cut-off JSON as malformed, and no usable tasks as empty', () => {
    expect(parsePlanReply('not json at all')).toEqual({ ok: false, reason: 'malformed' });
    expect(parsePlanReply('{"overview":"x","tasks":[{"title":"Cut o')).toEqual({ ok: false, reason: 'malformed' });
    expect(parsePlanReply(reply({ overview: 'x', tasks: [] }))).toEqual({ ok: false, reason: 'empty' });
    expect(parsePlanReply(reply({ overview: 'x', tasks: [{ priority: 'high' }, 7, null] }))).toEqual({ ok: false, reason: 'empty' });
  });

  it('fills safe defaults for missing or invalid fields', () => {
    const r = parsePlanReply(reply({ tasks: [{ title: 'A', priority: 'URGENT', kind: 'weird', effort: { size: 'XL' } }] }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const t = r.plan.tasks[0];
    expect(t.priority).toBe('medium');
    expect(t.kind).toBe('work');
    expect(t.effort).toEqual({ size: 'M', hours: 6 });
    expect(t.waitDays).toBe(0);
    expect(t.tags).toEqual(['planning']);
  });

  it('prefixes decision gates with "Decision:", tags them, and caps their effort', () => {
    const r = parsePlanReply(reply({ tasks: [{ key: 'G', kind: 'decision-gate', title: 'Is latency good enough', effort: { hours: 20 } }] }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const g = r.plan.tasks[0];
    expect(g.title).toBe('Decision: Is latency good enough');
    expect(g.tags).toContain('decision-gate');
    expect(g.effort.hours).toBeLessThanOrEqual(3);
  });

  it('resolves dependencies given as titles, drops unknown ones and self-references', () => {
    const r = parsePlanReply(
      reply({
        tasks: [
          { key: 'A', title: 'Set up project' },
          { key: 'B', title: 'Build it', dependsOn: ['set up project', 'ZZZ', 'B'] },
        ],
      })
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plan.tasks.find((t) => t.key === 'B')!.dependsOn).toEqual(['A']);
  });

  it('gives external-wait steps a real waiting period', () => {
    const r = parsePlanReply(reply({ tasks: [{ title: 'Register sender', kind: 'external-wait' }] }));
    expect(r.ok && r.plan.tasks[0].waitDays).toBeGreaterThanOrEqual(1);
  });

  it('keeps extracted schedule facts only when well formed', () => {
    const r = parsePlanReply(
      reply({
        planFacts: { schedule: { startDate: '2026-11-02', deadline: 'next month', hoursPerWeek: 5 } },
        tasks: [{ title: 'A' }],
      })
    );
    expect(r.ok && r.plan.facts.schedule).toEqual({ startDate: '2026-11-02', deadline: null, hoursPerWeek: 5 });
  });
});

describe('ordering and priority', () => {
  it('puts prerequisites first even when the model listed them last', () => {
    const tasks = [
      makeTask({ key: 'C', dependsOn: ['B'] }),
      makeTask({ key: 'B', dependsOn: ['A'] }),
      makeTask({ key: 'A' }),
    ];
    const ordered = orderTasks(tasks);
    expect(ordered.map((t) => t.key)).toEqual(['A', 'B', 'C']);
    expect(dependencyOrderViolations(ordered)).toEqual([]);
  });

  it('keeps the model order when there are no dependencies', () => {
    const tasks = ['X', 'Y', 'Z'].map((key) => makeTask({ key }));
    expect(orderTasks(tasks).map((t) => t.key)).toEqual(['X', 'Y', 'Z']);
  });

  it('breaks a dependency cycle instead of hanging, and says so', () => {
    const warnings: string[] = [];
    const tasks = [makeTask({ key: 'A', dependsOn: ['B'] }), makeTask({ key: 'B', dependsOn: ['A'] })];
    const ordered = orderTasks(tasks, warnings);
    expect(ordered).toHaveLength(2);
    expect(dependencyOrderViolations(ordered)).toEqual([]);
    expect(warnings.some((w) => w.includes('Circular'))).toBe(true);
  });

  it('raises a prerequisite to at least the priority of everything that depends on it', () => {
    // The fixture bug: the app shell (medium) is needed by high-priority cards.
    const tasks = [
      makeTask({ key: 'shell', priority: 'medium' }),
      makeTask({ key: 'push', priority: 'high', dependsOn: ['shell'] }),
      makeTask({ key: 'matching', priority: 'high', dependsOn: ['push'] }),
      makeTask({ key: 'stripe', priority: 'low', dependsOn: ['matching'] }),
    ];
    expect(priorityViolations(tasks).length).toBeGreaterThan(0);
    propagatePriority(tasks);
    expect(priorityViolations(tasks)).toEqual([]);
    expect(tasks.map((t) => t.priority)).toEqual(['high', 'high', 'high', 'low']);
  });

  it('keeps at most 12 distinct tags and at least one tag per card', () => {
    const tasks = Array.from({ length: 20 }, (_, i) => makeTask({ key: `T${i}`, tags: [`Tag ${i}`, i < 5 ? 'Common' : ''] }));
    normalizeTags(tasks);
    const distinct = new Set(tasks.flatMap((t) => t.tags));
    expect(distinct.size).toBeLessThanOrEqual(12);
    expect(tasks.every((t) => t.tags.length >= 1 && t.tags.length <= 3)).toBe(true);
    expect(distinct.has('common')).toBe(true);
  });
});
