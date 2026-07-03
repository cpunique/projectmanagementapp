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
        <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(245,158,11,.15)' }}>
          <svg className="w-5 h-5" style={{ color: 'var(--amber)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div>
          <p className="text-sm" style={{ color: 'var(--body)' }}>
            <strong style={{ color: 'var(--text)' }}>{localBoard.name}</strong> has conflicting changes. Review each difference and choose which version to keep.
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
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
            className="text-xs px-3 py-1.5 rounded-md transition-colors"
            style={{ background: 'rgba(96,165,250,.12)', color: '#93c5fd' }}
          >
            Keep all mine
          </button>
          <button
            onClick={() => handleResolveAll('remote')}
            className="text-xs px-3 py-1.5 rounded-md transition-colors"
            style={{ background: 'rgba(74,222,128,.12)', color: 'var(--green)' }}
          >
            Use all remote
          </button>
        </div>
      )}

      {/* Conflicts list */}
      {conflicts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
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
          <summary className="text-sm font-semibold cursor-pointer" style={{ color: 'var(--muted)' }}>
            Auto-resolved changes ({autoResolved.length})
          </summary>
          <div className="mt-2 space-y-2">
            {autoResolved.map((diff) => (
              <div
                key={diff.path}
                className="text-xs px-3 py-2 rounded"
                style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}
              >
                {diff.label} — {diff.conflictType === 'local_only' ? 'keeping your change' : 'keeping remote change'}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* No changes */}
      {diffs.length === 0 && (
        <p className="text-sm text-center py-4" style={{ color: 'var(--muted)' }}>
          No differences detected. Both versions are identical.
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleApply}
          disabled={resolving || !allResolved}
          className="flex-1 px-4 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-colors"
          style={{ background: 'var(--purple)' }}
        >
          {resolving ? 'Merging...' : `Apply merge${!allResolved ? ` (${conflicts.length - Object.keys(resolutions).filter(k => conflicts.some(c => c.path === k)).length} unresolved)` : ''}`}
        </button>
        <button
          onClick={onCancel}
          disabled={resolving}
          className="px-4 py-2.5 disabled:opacity-50 rounded-lg font-medium text-sm transition-colors"
          style={{ background: 'var(--surface-3)', color: 'var(--text)' }}
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
    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <div className="px-3 py-2 text-sm font-medium" style={{ background: 'var(--surface-2)', color: 'var(--body)' }}>
        {diff.label}
      </div>
      <div className="grid grid-cols-2" style={{ borderTop: '1px solid var(--border)' }}>
        {/* Local */}
        <button
          onClick={() => onResolve('local')}
          className="p-3 text-left transition-colors"
          style={
            resolution === 'local'
              ? { background: 'rgba(96,165,250,.12)', boxShadow: 'inset 0 0 0 2px #3b82f6', borderRight: '1px solid var(--border)' }
              : { borderRight: '1px solid var(--border)' }
          }
        >
          <div className="text-xs font-medium mb-1" style={{ color: '#93c5fd' }}>Mine</div>
          <div className="text-sm break-words" style={{ color: 'var(--text)' }}>
            {formatValue(diff.localValue)}
          </div>
        </button>
        {/* Remote */}
        <button
          onClick={() => onResolve('remote')}
          className="p-3 text-left transition-colors"
          style={
            resolution === 'remote'
              ? { background: 'rgba(74,222,128,.12)', boxShadow: 'inset 0 0 0 2px var(--green)' }
              : undefined
          }
        >
          <div className="text-xs font-medium mb-1" style={{ color: 'var(--green)' }}>Remote</div>
          <div className="text-sm break-words" style={{ color: 'var(--text)' }}>
            {formatValue(diff.remoteValue)}
          </div>
        </button>
      </div>
    </div>
  );
}
