import type { Board, Card, Column } from '@/types';

export interface FieldDiff {
  path: string;
  label: string; // Human-readable description
  baseValue: unknown;
  localValue: unknown;
  remoteValue: unknown;
  conflictType: 'both_changed' | 'local_only' | 'remote_only';
  resolution?: 'local' | 'remote';
}

/**
 * Compute field-level differences between base, local, and remote boards.
 * Returns only fields where at least one side changed from base.
 * Auto-resolves non-conflicting changes (only one side modified).
 */
export function computeBoardDiff(
  base: Board,
  local: Board,
  remote: Board
): FieldDiff[] {
  const diffs: FieldDiff[] = [];

  // Board-level fields
  diffField(diffs, 'name', 'Board name', base.name, local.name, remote.name);
  diffField(diffs, 'description', 'Board description', base.description, local.description, remote.description);

  // Build card maps for comparison
  const baseCards = flatCards(base);
  const localCards = flatCards(local);
  const remoteCards = flatCards(remote);

  // Find all unique card IDs across all versions
  const allCardIds = new Set([
    ...baseCards.keys(),
    ...localCards.keys(),
    ...remoteCards.keys(),
  ]);

  for (const cardId of allCardIds) {
    const baseCard = baseCards.get(cardId);
    const localCard = localCards.get(cardId);
    const remoteCard = remoteCards.get(cardId);

    // Card added locally only
    if (!baseCard && localCard && !remoteCard) {
      diffs.push({
        path: `cards.${cardId}.added`,
        label: `Card "${localCard.title}" added locally`,
        baseValue: null,
        localValue: localCard.title,
        remoteValue: null,
        conflictType: 'local_only',
        resolution: 'local',
      });
      continue;
    }

    // Card added remotely only
    if (!baseCard && !localCard && remoteCard) {
      diffs.push({
        path: `cards.${cardId}.added`,
        label: `Card "${remoteCard.title}" added remotely`,
        baseValue: null,
        localValue: null,
        remoteValue: remoteCard.title,
        conflictType: 'remote_only',
        resolution: 'remote',
      });
      continue;
    }

    // Card deleted locally
    if (baseCard && !localCard && remoteCard) {
      diffs.push({
        path: `cards.${cardId}.deleted`,
        label: `Card "${baseCard.title}" deleted locally`,
        baseValue: baseCard.title,
        localValue: null,
        remoteValue: remoteCard.title,
        conflictType: 'local_only',
        resolution: 'local',
      });
      continue;
    }

    // Card deleted remotely
    if (baseCard && localCard && !remoteCard) {
      diffs.push({
        path: `cards.${cardId}.deleted`,
        label: `Card "${baseCard.title}" deleted remotely`,
        baseValue: baseCard.title,
        localValue: localCard.title,
        remoteValue: null,
        conflictType: 'remote_only',
        resolution: 'remote',
      });
      continue;
    }

    // Card exists in all three — compare fields
    if (baseCard && localCard && remoteCard) {
      const cardLabel = localCard.title || remoteCard.title || 'Untitled';
      diffField(diffs, `cards.${cardId}.title`, `"${cardLabel}" title`, baseCard.title, localCard.title, remoteCard.title);
      diffField(diffs, `cards.${cardId}.description`, `"${cardLabel}" description`, baseCard.description, localCard.description, remoteCard.description);
      diffField(diffs, `cards.${cardId}.priority`, `"${cardLabel}" priority`, baseCard.priority, localCard.priority, remoteCard.priority);
      diffField(diffs, `cards.${cardId}.dueDate`, `"${cardLabel}" due date`, baseCard.dueDate, localCard.dueDate, remoteCard.dueDate);
      diffField(diffs, `cards.${cardId}.status`, `"${cardLabel}" status`, baseCard.status, localCard.status, remoteCard.status);
      diffField(diffs, `cards.${cardId}.color`, `"${cardLabel}" color`, baseCard.color, localCard.color, remoteCard.color);

      // Compare tags as sorted JSON strings
      const baseTags = JSON.stringify((baseCard.tags || []).sort());
      const localTags = JSON.stringify((localCard.tags || []).sort());
      const remoteTags = JSON.stringify((remoteCard.tags || []).sort());
      diffField(diffs, `cards.${cardId}.tags`, `"${cardLabel}" tags`, baseTags, localTags, remoteTags);

      // Compare column placement
      const baseCol = findCardColumn(base, cardId);
      const localCol = findCardColumn(local, cardId);
      const remoteCol = findCardColumn(remote, cardId);
      diffField(diffs, `cards.${cardId}.column`, `"${cardLabel}" column`, baseCol, localCol, remoteCol);
    }
  }

  // Column additions/deletions
  const baseCols = new Map(base.columns.map((c) => [c.id, c]));
  const localCols = new Map(local.columns.map((c) => [c.id, c]));
  const remoteCols = new Map(remote.columns.map((c) => [c.id, c]));
  const allColIds = new Set([...baseCols.keys(), ...localCols.keys(), ...remoteCols.keys()]);

  for (const colId of allColIds) {
    const baseCol = baseCols.get(colId);
    const localCol = localCols.get(colId);
    const remoteCol = remoteCols.get(colId);

    if (!baseCol && localCol && !remoteCol) {
      diffs.push({
        path: `columns.${colId}.added`,
        label: `Column "${localCol.title}" added locally`,
        baseValue: null, localValue: localCol.title, remoteValue: null,
        conflictType: 'local_only', resolution: 'local',
      });
    } else if (!baseCol && !localCol && remoteCol) {
      diffs.push({
        path: `columns.${colId}.added`,
        label: `Column "${remoteCol.title}" added remotely`,
        baseValue: null, localValue: null, remoteValue: remoteCol.title,
        conflictType: 'remote_only', resolution: 'remote',
      });
    } else if (baseCol && localCol && remoteCol) {
      diffField(diffs, `columns.${colId}.title`, `Column "${baseCol.title}" title`, baseCol.title, localCol.title, remoteCol.title);
    }
  }

  return diffs;
}

/**
 * Apply user's resolutions to produce a merged board.
 * Uses remote as the structural base and applies local changes where resolution is 'local'.
 */
export function applyResolutions(
  base: Board,
  local: Board,
  remote: Board,
  diffs: FieldDiff[]
): Board {
  // Start from remote as base structure
  const merged = structuredClone(remote);

  for (const diff of diffs) {
    if (diff.resolution === 'local') {
      applyLocalChange(merged, local, diff);
    }
    // resolution === 'remote' means keep remote value (already the default)
  }

  merged.updatedAt = new Date().toISOString();
  return merged;
}

// --- Helper functions ---

function diffField(
  diffs: FieldDiff[],
  path: string,
  label: string,
  baseVal: unknown,
  localVal: unknown,
  remoteVal: unknown
) {
  const baseStr = JSON.stringify(baseVal ?? null);
  const localStr = JSON.stringify(localVal ?? null);
  const remoteStr = JSON.stringify(remoteVal ?? null);

  const localChanged = localStr !== baseStr;
  const remoteChanged = remoteStr !== baseStr;

  if (!localChanged && !remoteChanged) return; // No changes

  if (localChanged && remoteChanged && localStr !== remoteStr) {
    // Both changed to different values — true conflict
    diffs.push({
      path, label, baseValue: baseVal, localValue: localVal, remoteValue: remoteVal,
      conflictType: 'both_changed',
    });
  } else if (localChanged && !remoteChanged) {
    diffs.push({
      path, label, baseValue: baseVal, localValue: localVal, remoteValue: remoteVal,
      conflictType: 'local_only', resolution: 'local',
    });
  } else if (!localChanged && remoteChanged) {
    diffs.push({
      path, label, baseValue: baseVal, localValue: localVal, remoteValue: remoteVal,
      conflictType: 'remote_only', resolution: 'remote',
    });
  }
  // If both changed to the same value, no diff needed
}

function flatCards(board: Board): Map<string, Card> {
  const map = new Map<string, Card>();
  for (const col of board.columns) {
    for (const card of col.cards) {
      map.set(card.id, card);
    }
  }
  return map;
}

function findCardColumn(board: Board, cardId: string): string | undefined {
  for (const col of board.columns) {
    if (col.cards.some((c) => c.id === cardId)) {
      return col.title;
    }
  }
  return undefined;
}

function applyLocalChange(merged: Board, local: Board, diff: FieldDiff) {
  // Board-level fields
  if (diff.path === 'name') {
    merged.name = local.name;
    return;
  }
  if (diff.path === 'description') {
    merged.description = local.description;
    return;
  }

  // Card field changes
  const cardFieldMatch = diff.path.match(/^cards\.([^.]+)\.(\w+)$/);
  if (cardFieldMatch) {
    const [, cardId, field] = cardFieldMatch;
    const localCard = flatCards(local).get(cardId);

    if (field === 'added' && localCard) {
      // Add locally-added card to the first column of merged
      if (merged.columns.length > 0) {
        merged.columns[0].cards.push(structuredClone(localCard));
      }
      return;
    }

    if (field === 'deleted') {
      // Remove card from merged
      for (const col of merged.columns) {
        col.cards = col.cards.filter((c) => c.id !== cardId);
      }
      return;
    }

    // Field-level update on existing card
    for (const col of merged.columns) {
      const card = col.cards.find((c) => c.id === cardId);
      if (card && localCard) {
        if (field === 'tags') {
          card.tags = localCard.tags;
        } else if (field === 'column') {
          // Move card to the local column
          const localColTitle = findCardColumn(local, cardId);
          const targetCol = merged.columns.find((c) => c.title === localColTitle);
          if (targetCol && targetCol.id !== col.id) {
            col.cards = col.cards.filter((c) => c.id !== cardId);
            targetCol.cards.push(card);
          }
        } else if (field in card) {
          (card as unknown as Record<string, unknown>)[field] = (localCard as unknown as Record<string, unknown>)[field];
        }
        return;
      }
    }
  }

  // Column changes
  const colMatch = diff.path.match(/^columns\.([^.]+)\.(\w+)$/);
  if (colMatch) {
    const [, colId, field] = colMatch;
    if (field === 'added') {
      const localCol = local.columns.find((c) => c.id === colId);
      if (localCol) {
        merged.columns.push(structuredClone(localCol));
      }
    } else if (field === 'title') {
      const mergedCol = merged.columns.find((c) => c.id === colId);
      const localCol = local.columns.find((c) => c.id === colId);
      if (mergedCol && localCol) {
        mergedCol.title = localCol.title;
      }
    }
  }
}
