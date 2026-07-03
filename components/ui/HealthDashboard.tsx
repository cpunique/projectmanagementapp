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
    return { id: b.id, name: b.name, sizeKB: Math.round(json.length / 1024 * 10) / 10 };
  });

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const syncStatusLabel: Record<string, string> = {
    synced: 'Synced',
    syncing: 'Syncing...',
    error: 'Sync Error',
    offline: 'Offline',
    idle: 'Idle',
  };

  const getStatusColor = (value: string): string => {
    const v = (value || '').toLowerCase().trim();
    if (['online', 'synced', 'connected', 'ok'].includes(v)) return 'var(--green)';
    if (['idle', 'syncing', 'pending', 'slow'].includes(v)) return 'var(--amber)';
    if (['offline', 'error', 'disconnected', 'failed'].includes(v)) return 'var(--red)';
    return 'var(--body)';
  };

  const modalSectionStyle = {
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '14px',
    boxShadow: '0 4px 14px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.05)',
  };

  const cardStyle = {
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '12px',
    boxShadow: '0 4px 14px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.05)',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="System Health" contentClassName="max-w-md">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', minHeight: 0 }}>
        {/* Network & Sync Status - elevated cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={cardStyle}>
            <div style={{ fontSize: '10.5px', color: 'var(--muted)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Network</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: getStatusColor(isOnline ? 'Online' : 'Offline') }}>
              {isOnline ? 'Online' : 'Offline'}
            </div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: '10.5px', color: 'var(--muted)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Sync Status</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: getStatusColor(syncState) }}>
              {syncStatusLabel[syncState] || syncState}
            </div>
          </div>
        </div>

        {/* Sync Details */}
        <div style={modalSectionStyle}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--purple-l)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '12px' }}>Sync Details</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
              <span style={{ color: 'var(--body)' }}>Last sync</span>
              <span style={{ color: 'var(--text)' }}>
                {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : 'Never'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
              <span style={{ color: 'var(--body)' }}>Pending</span>
              <span style={{ fontWeight: 600, color: (pendingCount || pendingOperations) > 0 ? 'var(--amber)' : 'var(--text)' }}>
                {pendingCount || pendingOperations}
              </span>
            </div>
          </div>
        </div>

        {/* Data */}
        <div style={modalSectionStyle}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--purple-l)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '12px' }}>Data</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
              <span style={{ color: 'var(--body)' }}>Boards</span>
              <span style={{ color: 'var(--text)' }}>{boards.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
              <span style={{ color: 'var(--body)' }}>Total cards</span>
              <span style={{ color: 'var(--text)' }}>{totalCards}</span>
            </div>
          </div>
        </div>

        {/* Board Sizes */}
        {boardSizes.length > 0 && (
          <div style={modalSectionStyle}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--purple-l)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '12px' }}>Board Sizes</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {boardSizes.map((b) => (
                <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                  <span style={{ color: 'var(--body)', maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</span>
                  <span style={{ color: 'var(--text)', whiteSpace: 'nowrap', marginLeft: '8px' }}>{b.sizeKB} KB</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Browser Storage */}
        {storageEstimate && (
          <div style={modalSectionStyle}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--purple-l)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '12px' }}>Browser Storage</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                <span style={{ color: 'var(--body)' }}>Used</span>
                <span style={{ color: 'var(--text)' }}>{formatBytes(storageEstimate.usage)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                <span style={{ color: 'var(--body)' }}>Quota</span>
                <span style={{ color: 'var(--text)' }}>{formatBytes(storageEstimate.quota)}</span>
              </div>
              {storageEstimate.quota > 0 && (() => {
                const realPct = (storageEstimate.usage / storageEstimate.quota) * 100;
                const fillPct = storageEstimate.usage > 0 ? Math.max(Math.min(realPct, 100), 1.5) : 0;
                const pctLabel = realPct < 0.01 ? '<0.01' : realPct.toFixed(2);
                return (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>
                      {pctLabel}% of {formatBytes(storageEstimate.quota)} used
                    </div>
                    <div style={{ height: '8px', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: '99px', overflow: 'hidden', marginTop: '4px' }}>
                      <div style={{
                        height: '100%',
                        background: 'linear-gradient(90deg, var(--purple), var(--purple-l))',
                        borderRadius: '99px',
                        width: `${fillPct}%`,
                      }} />
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
