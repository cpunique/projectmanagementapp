'use client';

import { useState, useMemo } from 'react';
import type { Board } from '@/types';
import { computeBoardDiff, applyResolutions, type FieldDiff } from '@/lib/utils/boardDiff';

interface ConflictMergePanelProps {
  baseBoard: Board;
  localBoard: Board;
  remoteBoard: Board;
  onResolve: (mergedBoard: Board) => void;
  onCancel: () => void;
  resolving: boolean;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '(none)';
  if (typeof value === 'string') {
    // Try to parse JSON arrays (e.g. tags)
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.join(', ') || '(none)';
    } catch {
      // Not JSON, use as-is
    }
    return value || '(empty)';
  }
  return String(value);
}

export default function ConflictMergePanel({
  baseBoard,
  localBoard,
  remoteBoard,
  onResolve,
  onCancel,
  resolving,
}: ConflictMergePanelProps) {
  const diffs = useMemo(
    () => computeBoardDiff(baseBoard, localBoard, remoteBoard),
    [baseBoard, localBoard, remoteBoard]
  );

  const [resolutions, setResolutions] = useState<Record<string, 'local' | 'remote'>>(() => {
    const initial: Record<string, 'local' | 'remote'> = {};
    for (const diff of diffs) {
      if (diff.resolution) {
        initial[diff.path] = diff.resolution;
      }
    }
    return initial;
  });

  const conflicts = diffs.filter((d) => d.conflictType === 'both_changed');
  const autoResolved = diffs.filter((d) => d.conflictType !== 'both_changed');
  const allResolved = conflicts.every((d) => resolutions[d.path] !== undefined);

  const setResolution = (path: string, value: 'local' | 'remote') => {
    setResolutions((prev) => ({ ...prev, [path]: value }));
  };

  const handleResolveAll = (side: 'local' | 'remote') => {
    const updated = { ...resolutions };
    for (const diff of conflicts) {
      updated[diff.path] = side;
    }
    setResolutions(updated);
  };

  const handleApply = () => {
    const resolvedDiffs: FieldDiff[] = diffs.map((diff) => ({
      ...diff,
      resolution: resolutions[diff.path] ?? diff.resolution,
    }));
    const merged = applyResolutions(baseBoard, localBoard, remoteBoard, resolvedDiffs);
    onResolve(merged);
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>{localBoard.name}</strong> has conflicting changes. Review each difference and choose which version to keep.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} to resolve
            {autoResolved.length > 0 && `, ${autoResolved.length} auto-resolved`}
          </p>
        </div>
      </div>

      {/* Bulk actions */}
      {conflicts.length > 1 && (
        <div className="flex gap-2">
          <button
            onClick={() => handleResolveAll('local')}
            className="text-xs px-3 py-1.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
          >
            Keep all mine
          </button>
          <button
            onClick={() => handleResolveAll('remote')}
            className="text-xs px-3 py-1.5 rounded-md bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
          >
            Use all remote
          </button>
        </div>
      )}

      {/* Conflicts list */}
      {conflicts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Conflicts (choose one)
          </h3>
          {conflicts.map((diff) => (
            <ConflictRow
              key={diff.path}
              diff={diff}
              resolution={resolutions[diff.path]}
              onResolve={(side) => setResolution(diff.path, side)}
            />
          ))}
        </div>
      )}

      {/* Auto-resolved changes */}
      {autoResolved.length > 0 && (
        <details className="group">
          <summary className="text-sm font-semibold text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-800 dark:hover:text-gray-200">
            Auto-resolved changes ({autoResolved.length})
          </summary>
          <div className="mt-2 space-y-2">
            {autoResolved.map((diff) => (
              <div
                key={diff.path}
                className="text-xs px-3 py-2 rounded bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400"
              >
                {diff.label} — {diff.conflictType === 'local_only' ? 'keeping your change' : 'keeping remote change'}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* No changes */}
      {diffs.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          No differences detected. Both versions are identical.
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleApply}
          disabled={resolving || !allResolved}
          className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-colors"
        >
          {resolving ? 'Merging...' : `Apply merge${!allResolved ? ` (${conflicts.length - Object.keys(resolutions).filter(k => conflicts.some(c => c.path === k)).length} unresolved)` : ''}`}
        </button>
        <button
          onClick={onCancel}
          disabled={resolving}
          className="px-4 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-800 dark:text-gray-200 rounded-lg font-medium text-sm transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

function ConflictRow({
  diff,
  resolution,
  onResolve,
}: {
  diff: FieldDiff;
  resolution?: 'local' | 'remote';
  onResolve: (side: 'local' | 'remote') => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300">
        {diff.label}
      </div>
      <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
        {/* Local */}
        <button
          onClick={() => onResolve('local')}
          className={`p-3 text-left transition-colors ${
            resolution === 'local'
              ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-inset ring-blue-500'
              : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
          }`}
        >
          <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Mine</div>
          <div className="text-sm text-gray-800 dark:text-gray-200 break-words">
            {formatValue(diff.localValue)}
          </div>
        </button>
        {/* Remote */}
        <button
          onClick={() => onResolve('remote')}
          className={`p-3 text-left transition-colors ${
            resolution === 'remote'
              ? 'bg-green-50 dark:bg-green-900/20 ring-2 ring-inset ring-green-500'
              : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
          }`}
        >
          <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Remote</div>
          <div className="text-sm text-gray-800 dark:text-gray-200 break-words">
            {formatValue(diff.remoteValue)}
          </div>
        </button>
      </div>
    </div>
  );
}
