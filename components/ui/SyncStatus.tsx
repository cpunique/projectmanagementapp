'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';
import { useKanbanStore } from '@/lib/store';
import { retrySyncQueue } from '@/lib/syncQueue';

export default function SyncStatus() {
  const { user } = useAuth();
  const syncState = useKanbanStore((state) => state.syncState);
  const isOnline = useKanbanStore((state) => state.isOnline);
  const pendingOperations = useKanbanStore((state) => state.pendingOperations);
  const syncProgress = useKanbanStore((state) => state.syncProgress);
  const conflictState = useKanbanStore((state) => state.conflictState);
  const setSyncState = useKanbanStore((state) => state.setSyncState);

  // Auto-hide synced status after 2 seconds
  useEffect(() => {
    if (syncState === 'synced') {
      const timer = setTimeout(() => {
        setSyncState('idle');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [syncState, setSyncState]);

  // Don't show sync status if user is not authenticated
  if (!user || (syncState === 'idle' && !conflictState)) {
    return null;
  }

  const getStatusStyles = () => {
    switch (syncState) {
      case 'syncing':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      case 'synced':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'offline':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 'error':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      default:
        return 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800';
    }
  };

  const getStatusIcon = () => {
    switch (syncState) {
      case 'syncing':
        return <span className="animate-spin">⟳</span>;
      case 'synced':
        return <span>✓</span>;
      case 'offline':
        return <span>⚠</span>;
      case 'error':
        return <span>✗</span>;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (syncState) {
      case 'syncing':
        if (syncProgress) {
          return `Syncing ${syncProgress.completed}/${syncProgress.total}`;
        }
        return 'Syncing...';
      case 'synced':
        return 'Synced';
      case 'offline':
        return pendingOperations > 0
          ? `Offline (${pendingOperations} queued)`
          : 'Offline';
      case 'error':
        return pendingOperations > 0
          ? `Sync failed (${pendingOperations} queued)`
          : 'Sync failed';
      default:
        return '';
    }
  };

  // Conflict state overrides normal sync display
  if (conflictState) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20">
        <span>⚠</span>
        <span>Conflict detected</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium ${getStatusStyles()}`}>
      {getStatusIcon()}
      <span>{getStatusText()}</span>
      {syncState === 'error' && (
        <button
          onClick={() => retrySyncQueue()}
          className="ml-1 underline hover:no-underline"
          title="Retry failed sync operations"
        >
          Retry
        </button>
      )}
    </div>
  );
}
