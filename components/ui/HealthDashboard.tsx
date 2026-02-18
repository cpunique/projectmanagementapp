'use client';

import { useState, useEffect } from 'react';
import { useKanbanStore } from '@/lib/store';
import { getPendingCount } from '@/lib/db';
import Modal from '@/components/ui/Modal';

interface HealthDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HealthDashboard({ isOpen, onClose }: HealthDashboardProps) {
  const syncState = useKanbanStore((state) => state.syncState);
  const lastSyncTime = useKanbanStore((state) => state.lastSyncTime);
  const isOnline = useKanbanStore((state) => state.isOnline);
  const pendingOperations = useKanbanStore((state) => state.pendingOperations);
  const boards = useKanbanStore((state) => state.boards);

  const [pendingCount, setPendingCount] = useState(0);
  const [storageEstimate, setStorageEstimate] = useState<{ usage: number; quota: number } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    // Refresh pending count
    getPendingCount().then(setPendingCount).catch(() => {});
    // Check storage estimate
    if (navigator.storage?.estimate) {
      navigator.storage.estimate().then((est) => {
        setStorageEstimate({ usage: est.usage || 0, quota: est.quota || 0 });
      }).catch(() => {});
    }
  }, [isOpen]);

  const totalCards = boards.reduce(
    (sum, b) => sum + b.columns.reduce((s, c) => s + c.cards.length, 0),
    0
  );

  const boardSizes = boards.map((b) => {
    const json = JSON.stringify(b);
    return { name: b.name, sizeKB: Math.round(json.length / 1024 * 10) / 10 };
  });

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const syncStatusColor: Record<string, string> = {
    synced: 'text-green-600 dark:text-green-400',
    syncing: 'text-blue-600 dark:text-blue-400',
    error: 'text-red-600 dark:text-red-400',
    offline: 'text-yellow-600 dark:text-yellow-400',
    idle: 'text-gray-500 dark:text-gray-400',
  };

  const syncStatusLabel: Record<string, string> = {
    synced: 'Synced',
    syncing: 'Syncing...',
    error: 'Sync Error',
    offline: 'Offline',
    idle: 'Idle',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="System Health" contentClassName="max-w-md">
      <div className="space-y-4">
        {/* Connectivity */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <div className="text-xs text-gray-500 dark:text-gray-400">Network</div>
            <div className={`text-sm font-medium mt-0.5 ${isOnline ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <div className="text-xs text-gray-500 dark:text-gray-400">Sync Status</div>
            <div className={`text-sm font-medium mt-0.5 ${syncStatusColor[syncState] || ''}`}>
              {syncStatusLabel[syncState] || syncState}
            </div>
          </div>
        </div>

        {/* Sync details */}
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Last sync</span>
            <span className="text-gray-800 dark:text-gray-200">
              {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : 'Never'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Pending operations</span>
            <span className={`font-medium ${(pendingCount || pendingOperations) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-800 dark:text-gray-200'}`}>
              {pendingCount || pendingOperations}
            </span>
          </div>
        </div>

        {/* Data summary */}
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 space-y-2">
          <div className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Data</div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Boards</span>
            <span className="text-gray-800 dark:text-gray-200">{boards.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Total cards</span>
            <span className="text-gray-800 dark:text-gray-200">{totalCards}</span>
          </div>
        </div>

        {/* Board document sizes */}
        {boardSizes.length > 0 && (
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 space-y-2">
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Board Sizes</div>
            {boardSizes.map((b) => (
              <div key={b.name} className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400 truncate max-w-[60%]">{b.name}</span>
                <span className="text-gray-800 dark:text-gray-200">{b.sizeKB} KB</span>
              </div>
            ))}
          </div>
        )}

        {/* Storage estimate */}
        {storageEstimate && (
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 space-y-2">
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Browser Storage</div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Used</span>
              <span className="text-gray-800 dark:text-gray-200">{formatBytes(storageEstimate.usage)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Quota</span>
              <span className="text-gray-800 dark:text-gray-200">{formatBytes(storageEstimate.quota)}</span>
            </div>
            {storageEstimate.quota > 0 && (
              <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{ width: `${Math.min((storageEstimate.usage / storageEstimate.quota) * 100, 100)}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
