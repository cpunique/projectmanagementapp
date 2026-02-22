import type { Board, Column, Card } from '@/types';
import { generateId } from '@/lib/utils';

/**
 * Download a single board as a JSON file.
 */
export function downloadBoardAsJSON(board: Board): void {
  const data = JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      boards: [board],
    },
    null,
    2
  );

  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${board.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Parse a board export JSON string and return sanitized columns ready for addBoard().
 * Returns null if the file is invalid.
 * All column and card IDs are regenerated to avoid collisions with existing data.
 */
export function parseBoardImportJSON(
  jsonText: string
): { name: string; description?: string; columns: Column[] } | null {
  try {
    const data = JSON.parse(jsonText);
    const boards = data.boards as Board[];
    if (!boards || !Array.isArray(boards) || boards.length === 0) return null;
    const source = boards[0];
    if (!source?.name || !Array.isArray(source.columns)) return null;

    const columns: Column[] = source.columns.map((col: Column) => ({
      ...col,
      id: generateId(),
      archived: false,
      cards: (col.cards || []).map((card: Card) => ({
        ...card,
        id: generateId(),
        archived: false,
        assignees: [],
        // Strip any user-specific references
        comments: [],
      })),
    }));

    return {
      name: source.name,
      description: source.description,
      columns,
    };
  } catch {
    return null;
  }
}

/**
 * Download all boards as a single JSON file.
 */
export function downloadAllBoardsAsJSON(boards: Board[]): void {
  const data = JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      boards,
    },
    null,
    2
  );

  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kanban_boards_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
