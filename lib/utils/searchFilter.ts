import type { Card, KanbanState } from '@/types';

/**
 * Filter cards based on search query and active filters.
 * Returns the full array unchanged when no query/filters are active.
 */
export function filterCards(
  cards: Card[],
  query: string,
  filters: KanbanState['filters']
): Card[] {
  // Exclude archived cards from all normal board/calendar views
  let result = cards.filter((card) => !card.archived);
  const trimmed = query.trim().toLowerCase();

  // Text search: match title, description, or tags
  if (trimmed) {
    result = result.filter((card) =>
      card.title.toLowerCase().includes(trimmed) ||
      (card.description || '').toLowerCase().includes(trimmed) ||
      (card.tags || []).some((tag) => tag.toLowerCase().includes(trimmed))
    );
  }

  // Priority filter
  if (filters.priorities && filters.priorities.length > 0) {
    result = result.filter(
      (card) => card.priority && filters.priorities!.includes(card.priority)
    );
  }

  // Tag filter
  if (filters.tags && filters.tags.length > 0) {
    result = result.filter(
      (card) => card.tags?.some((t) => filters.tags!.includes(t))
    );
  }

  // Due date range filter
  if (filters.dueDateRange) {
    const [start, end] = filters.dueDateRange;
    result = result.filter((card) => {
      if (!card.dueDate) return false;
      return card.dueDate >= start && card.dueDate <= end;
    });
  }

  // Overdue filter
  if (filters.showOverdue) {
    const now = new Date().toISOString().split('T')[0];
    result = result.filter(
      (card) => card.dueDate && card.dueDate < now
    );
  }

  // Assignee filter
  if (filters.assignees && filters.assignees.length > 0) {
    result = result.filter(
      (card) => card.assignees?.some((id) => filters.assignees!.includes(id))
    );
  }

  return result;
}

/**
 * Check whether any filter is currently active
 */
export function hasActiveFilters(query: string, filters: KanbanState['filters']): boolean {
  return (
    query.trim().length > 0 ||
    (filters.priorities?.length ?? 0) > 0 ||
    (filters.tags?.length ?? 0) > 0 ||
    !!filters.dueDateRange ||
    !!filters.showOverdue ||
    (filters.assignees?.length ?? 0) > 0
  );
}
