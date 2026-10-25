import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EXPERT_INPUT } from '../fixtures/inputs';

// Characterization of the OLD generator's output on the expert fixture. These are
// the "before" measurements the later fixes are compared against; they describe
// the saved export, not the current generator.

type FixtureCard = {
  title: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  checklist: { text: string }[];
  description: string;
  notes: string;
  tags: string[];
};

const fixture = JSON.parse(
  readFileSync(join(__dirname, '../fixtures/Sub_Pro_2026-10-25.json'), 'utf8')
);
const board = fixture.boards[0];
const cards: FixtureCard[] = board.columns.flatMap((c: { cards: FixtureCard[] }) => c.cards);

describe('expert fixture (pre-change output)', () => {
  it('is redacted and in the version 1 export format', () => {
    expect(fixture.version).toBe(1);
    expect(board.ownerId).toBe('REDACTED');
    expect(board.ownerEmail).toBe('REDACTED');
  });

  it('input is the 475-character expert text', () => {
    expect(EXPERT_INPUT.length).toBe(475);
  });

  it('has 10 cards, every one with exactly five checklist items (the "templated" look)', () => {
    expect(cards).toHaveLength(10);
    expect(new Set(cards.map((c) => c.checklist.length))).toEqual(new Set([5]));
  });

  it('has no decision-gate cards and no assumption labels', () => {
    expect(cards.some((c) => c.tags.includes('decision-gate'))).toBe(false);
    const all = JSON.stringify(cards).toLowerCase();
    expect(all.includes('assumption')).toBe(false);
  });

  it('shows the priority inversion: the app shell (medium) is a prerequisite of high-priority cards', () => {
    const shell = cards.find((c) => c.title.startsWith('Build Core PWA Shell'))!;
    const push = cards.find((c) => c.title.startsWith('Implement Push Alerts'))!;
    expect(shell.priority).toBe('medium');
    expect(push.priority).toBe('high');
  });

  it('has due dates from 27 Oct to 22 Nov', () => {
    const dates = cards.map((c) => c.dueDate).sort();
    expect(dates[0]).toBe('2026-10-27');
    expect(dates[dates.length - 1]).toBe('2026-11-22');
  });
});
