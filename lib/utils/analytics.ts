import type { Board, Card } from '@/types';

export interface BoardAnalytics {
  totalCards: number;
  cardsByColumn: { column: string; count: number }[];
  cardsByPriority: { priority: string; count: number }[];
  completionRate: number; // 0-100
  overdueCount: number;
  dueSoonCount: number; // due in next 7 days
  tagDistribution: { tag: string; count: number }[];
  averageChecklistProgress: number; // 0-100
}

/**
 * Compute analytics for a single board. Pure function — no side effects.
 */
export function computeBoardAnalytics(board: Board): BoardAnalytics {
  const allCards = board.columns.flatMap((col) => col.cards);
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Cards by column
  const cardsByColumn = board.columns.map((col) => ({
    column: col.title,
    count: col.cards.length,
  }));

  // Cards by priority
  const priorityCounts: Record<string, number> = { high: 0, medium: 0, low: 0, none: 0 };
  for (const card of allCards) {
    priorityCounts[card.priority || 'none']++;
  }
  const cardsByPriority = Object.entries(priorityCounts)
    .filter(([, count]) => count > 0)
    .map(([priority, count]) => ({ priority, count }));

  // Completion rate: cards in last column / total
  const lastColumn = board.columns[board.columns.length - 1];
  const completedCards = lastColumn ? lastColumn.cards.length : 0;
  const completionRate = allCards.length > 0 ? Math.round((completedCards / allCards.length) * 100) : 0;

  // Overdue & due soon
  let overdueCount = 0;
  let dueSoonCount = 0;
  for (const card of allCards) {
    if (!card.dueDate) continue;
    const due = new Date(card.dueDate);
    if (due < now) {
      overdueCount++;
    } else if (due <= sevenDaysFromNow) {
      dueSoonCount++;
    }
  }

  // Tag distribution
  const tagCounts = new Map<string, number>();
  for (const card of allCards) {
    for (const tag of card.tags || []) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }
  const tagDistribution = Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Average checklist progress
  let totalProgress = 0;
  let checklistCardCount = 0;
  for (const card of allCards) {
    if (card.checklist && card.checklist.length > 0) {
      const completed = card.checklist.filter((item) => item.completed).length;
      totalProgress += (completed / card.checklist.length) * 100;
      checklistCardCount++;
    }
  }
  const averageChecklistProgress = checklistCardCount > 0
    ? Math.round(totalProgress / checklistCardCount)
    : 0;

  return {
    totalCards: allCards.length,
    cardsByColumn,
    cardsByPriority,
    completionRate,
    overdueCount,
    dueSoonCount,
    tagDistribution,
    averageChecklistProgress,
  };
}
