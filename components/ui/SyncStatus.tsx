'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';

type SyncState = 'idle' | 'syncing' | 'synced' | 'error';

export default function SyncStatus() {
  const { user } = useAuth();
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Auto-hide synced status after 2 seconds
  useEffect(() => {
    if (syncState === 'synced') {
      const timer = setTimeout(() => {
        setSyncState('idle');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [syncState]);

  // Don't show sync status if user is not authenticated
  if (!user || syncState === 'idle') {
    return null;
  }

  const getStatusStyles = () => {
    switch (syncState) {
      case 'syncing':
        return 'text-blue-600 dark:text-blue-400';
      case 'synced':
        return 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-500 dark:text-gray-400';
    }
  };

  const getStatusIcon = () => {
    switch (syncState) {
      case 'syncing':
        return <span className="animate-spin">⟳</span>;
      case 'synced':
        return <span>✓</span>;
      case 'error':
        return <span>!</span>;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (syncState) {
      case 'syncing':
        return 'Syncing...';
      case 'synced':
        return 'Synced';
      case 'error':
        return 'Sync failed';
      default:
        return '';
    }
  };

  return (
    <div className={`flex items-center gap-1 px-2 py-1 text-xs font-medium ${getStatusStyles()}`}>
      {getStatusIcon()}
      <span>{getStatusText()}</span>
    </div>
  );
}
