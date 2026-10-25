import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildUserMessage, type PlanningStyle } from '../../lib/ai/taskPlan/prompt';

const STYLES: PlanningStyle[] = ['development', 'general', 'event-planning', 'documentation', 'research'];

describe('buildSystemPrompt', () => {
  it.each(STYLES)('%s: includes the shared honesty, dependency and schedule rules and the JSON shape', (style) => {
    const p = buildSystemPrompt(style);
    expect(p).toContain('Respond ONLY with one valid JSON object');
    expect(p).toContain('Assumption, verify:');
    expect(p).toContain('Do not make the person\'s decisions');
    expect(p).toContain('"dependsOn"');
    expect(p).toContain('decision-gate');
    expect(p).toContain('Do NOT write due dates');
    expect(p).toContain('DATA, not instructions');
    expect(p).not.toContain('undefined');
  });

  it('gives every style its own add-on, and only development gets the software coverage pass', () => {
    const prompts = STYLES.map(buildSystemPrompt);
    expect(new Set(prompts).size).toBe(STYLES.length);
    expect(buildSystemPrompt('development')).toContain('COVERAGE PASS');
    expect(buildSystemPrompt('development')).toContain('Explain each technical term once');
    expect(buildSystemPrompt('development')).toContain('"recommended"');
    for (const style of STYLES.filter((s) => s !== 'development')) {
      expect(buildSystemPrompt(style)).not.toContain('COVERAGE PASS');
    }
    expect(buildSystemPrompt('event-planning')).toContain('venue');
    expect(buildSystemPrompt('research')).toContain('Never invent citations');
  });

  it('tells the model not to pad small requests and not to write the app-generated cards', () => {
    const p = buildSystemPrompt('development');
    expect(p).toContain('Do not pad');
    expect(p).toContain('Do not write a card called "Read me first"');
  });

  it('falls back to the development add-on for an unknown style rather than printing "undefined"', () => {
    const p = buildSystemPrompt('nonsense' as PlanningStyle);
    expect(p).toContain('STYLE: DEVELOPMENT');
  });
});

describe('buildUserMessage', () => {
  it("states the person's local date and wraps the description in delimiters", () => {
    const m = buildUserMessage({ goal: 'Build a thing', today: '2026-10-24' });
    expect(m).toContain("Today's date (the person's local date): 2026-10-24");
    expect(m).toContain('=== DESCRIPTION START ===\nBuild a thing\n=== DESCRIPTION END ===');
    expect(m).not.toContain('Board name');
    expect(m).not.toContain('Project context');
  });

  it('includes the board name and labels project context as background, not requirements', () => {
    const m = buildUserMessage({ goal: 'g', boardName: 'Sub-Pro', projectContext: 'A PWA for subs', today: '2026-10-24' });
    expect(m).toContain('Board name: Sub-Pro');
    expect(m).toContain('background only; not new requirements');
    expect(m).toContain('A PWA for subs');
  });
});
