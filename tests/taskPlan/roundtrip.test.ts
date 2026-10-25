import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { interpretPlanReply } from '../../lib/ai/taskPlan/pipeline';
import { taskToCardData, type GeneratedTaskFields } from '../../lib/ai/taskPlan/toCardData';
import { parseBoardImportJSON } from '../../lib/utils/exportBoard';

type GeneratedCard = GeneratedTaskFields & { dueDate: string };

const reply = {
  overview: 'o',
  tasks: [
    { key: 'T1', title: 'Check the platform allows forwarding', kind: 'validation', priority: 'high', description: 'Read the terms.', whyItMatters: 'It could block the product.', effort: { hours: 2 }, checklist: ['Read the terms', 'Ask support'], notes: 'Terms: the rules you agree to.', tags: ['legal'] },
    { key: 'T2', title: 'Build the parser', priority: 'medium', description: 'Parse emails.', dependsOn: ['T1'], effort: { hours: 6 }, checklist: ['Write it', 'Test it', 'Ship it'], tags: ['parser'] },
  ],
};

function generatedCards(): GeneratedCard[] {
  const r = interpretPlanReply(JSON.stringify(reply), { inputText: '', localDate: '2026-11-02' });
  if (!r.ok) throw new Error('expected ok');
  return r.body.tasks as GeneratedCard[];
}

// Builds the same board shape the app stores after the modal adds the cards.
function boardWith(cards: GeneratedCard[]) {
  return {
    id: 'b1',
    name: 'Round trip',
    description: '',
    ownerId: 'u1',
    columns: [
      {
        id: 'c1',
        title: 'Backlog',
        order: 0,
        cards: cards.map((c, i) => ({
          ...taskToCardData(c, c.dueDate, `cl-${i}`),
          id: `card-${i}`,
          boardId: 'b1',
          columnId: 'c1',
          order: i,
          createdAt: '2026-11-02T00:00:00.000Z',
          updatedAt: '2026-11-02T00:00:00.000Z',
        })),
      },
    ],
  };
}

describe('export/import round trip with generated cards', () => {
  it('maps a generated task to the existing card fields (no new fields)', () => {
    const card = generatedCards().find((c) => c.title === 'Check the platform allows forwarding')!;
    const data = taskToCardData(card, card.dueDate, 'cl-x');
    expect(Object.keys(data).sort()).toEqual(['checklist', 'color', 'description', 'dueDate', 'notes', 'priority', 'tags', 'title'].sort());
    expect(data.checklist![0]).toMatchObject({ id: 'cl-x-0', completed: false, order: 0 });
  });

  it('survives export -> import with content intact and IDs regenerated', () => {
    const cards = generatedCards();
    const board = boardWith(cards);
    // Same envelope downloadBoardAsJSON writes.
    const text = JSON.stringify({ version: 1, exportedAt: '2026-11-02T00:00:00.000Z', boards: [board] }, null, 2);
    const imported = parseBoardImportJSON(text);
    expect(imported).not.toBeNull();
    const out = imported!.columns[0].cards;
    expect(out).toHaveLength(cards.length);
    out.forEach((card, i) => {
      expect(card.title).toBe(cards[i].title);
      expect(card.description).toBe(cards[i].description);
      expect(card.dueDate).toBe(cards[i].dueDate);
      expect(card.priority).toBe(cards[i].priority);
      expect(card.checklist?.map((x) => x.text)).toEqual(cards[i].checklist);
      expect(card.id).not.toBe(`card-${i}`); // regenerated to avoid collisions
    });
  });

  it('still imports the real version 1 export of the old generator output', () => {
    const text = readFileSync(join(__dirname, '../fixtures/Sub_Pro_2026-10-25.json'), 'utf8');
    const imported = parseBoardImportJSON(text);
    expect(imported?.name).toBe('Sub-Pro');
    expect(imported?.columns[0].cards).toHaveLength(10);
  });

  it('keeps unknown extra card fields, so a later schema addition survives a round trip', () => {
    const board = boardWith(generatedCards());
    (board.columns[0].cards[0] as Record<string, unknown>).dependsOn = ['card-9'];
    const imported = parseBoardImportJSON(JSON.stringify({ version: 2, boards: [board] }));
    expect((imported!.columns[0].cards[0] as unknown as Record<string, unknown>).dependsOn).toEqual(['card-9']);
  });
});
