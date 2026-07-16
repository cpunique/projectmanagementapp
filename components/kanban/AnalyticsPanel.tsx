'use client';

import { useMemo, useState, useEffect } from 'react';
import { useKanbanStore } from '@/lib/store';
import { computeBoardAnalytics } from '@/lib/utils/analytics';
import { fetchCompletedByWeek } from '@/lib/firebase/activities';
import { COMPLETED_COLUMN_KEYWORDS } from '@/lib/constants';
import PanelShell from '@/components/ui/PanelShell';

const PRIORITY_FILL: Record<string, string> = {
  high: 'var(--red)',
  medium: 'var(--amber)',
  low: 'var(--green)',
  none: 'var(--muted)',
};

const CARD_AGE_FILL: Record<string, string> = {
  '> 30 days': 'var(--amber)',
  '7–30 days': 'var(--amber)',
  '1–7 days': 'var(--green)',
  '< 1 day':  'var(--green)',
};

const sectH: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '.6px',
  color: 'var(--purple-l)',
  marginBottom: 11,
};

function EmptyState({ text, sub }: { text: string; sub?: string }) {
  return (
    <div style={{
      background: 'var(--surface-2)',
      border: '1px dashed var(--border-2)',
      borderRadius: 11,
      padding: '22px 14px',
      textAlign: 'center',
    }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
        style={{ color: 'var(--muted)', display: 'block', margin: '0 auto 8px' }}>
        <path d="M3 3v18h18" /><path d="M18 9l-5 5-3-3-4 4" />
      </svg>
      <p style={{ fontSize: 12, color: 'var(--body)' }}>{text}</p>
      {sub && <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{sub}</p>}
    </div>
  );
}

function BarChart({ items, maxCount }: {
  items: { label: string; count: number; fill: string }[];
  maxCount: number;
}) {
  if (maxCount === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item) => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
          <span style={{ width: 74, color: 'var(--body)', textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            title={item.label}>
            {item.label}
          </span>
          <div style={{ flex: 1, height: 9, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              borderRadius: 99,
              background: item.fill,
              width: `${(item.count / maxCount) * 100}%`,
              transition: 'width 0.5s',
            }} />
          </div>
          <span style={{ width: 16, color: 'var(--muted)', fontSize: 11, textAlign: 'right' }}>
            {item.count}
          </span>
        </div>
      ))}
    </div>
  );
}

function ActivityHeatmap({ data }: { data: { date: string; label: string; count: number }[] }) {
  const allZero = data.every((d) => d.count === 0);
  if (allZero) {
    return <EmptyState text="No activity yet" sub="Cards updated today will appear here" />;
  }
  const max = Math.max(...data.map((d) => d.count), 1);
  const axisStart = data[0]?.label ?? '';
  const axisMid = data[7]?.label ?? '';
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 64, marginBottom: 6 }}>
        {data.map((d) => {
          const heightPct = Math.max((d.count / max) * 100, d.count > 0 ? 6 : 3);
          return (
            <div
              key={d.date}
              className="group"
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', position: 'relative', cursor: 'default' }}
            >
              <div style={{
                width: '100%',
                borderRadius: 3,
                background: 'var(--purple)',
                height: `${heightPct}%`,
                opacity: d.count === 0 ? 0.18 : 1,
                transition: 'height 0.5s',
              }} />
              <div
                className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
                style={{
                  background: 'var(--surface-3)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontSize: 11,
                  borderRadius: 6,
                  padding: '3px 8px',
                  whiteSpace: 'nowrap',
                }}
              >
                {d.label}: {d.count}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)' }}>
        <span>{axisStart}</span>
        <span>{axisMid}</span>
      </div>
    </>
  );
}

function VelocityChart({ data }: { data: { weekLabel: string; count: number }[] }) {
  const allZero = data.every((d) => d.count === 0);
  if (allZero) {
    return <EmptyState text="No completed cards yet" sub="Cards moved to Done will appear here" />;
  }
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 80, marginBottom: 6 }}>
      {data.map((d) => {
        const heightPct = Math.max((d.count / max) * 100, d.count > 0 ? 5 : 3);
        return (
          <div
            key={d.weekLabel}
            className="group"
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', position: 'relative' }}
          >
            <div style={{
              width: '100%',
              borderRadius: '3px 3px 0 0',
              background: d.count === 0 ? 'var(--surface-3)' : 'var(--green)',
              height: `${heightPct}%`,
              transition: 'height 0.5s',
            }} />
            <div
              className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
              style={{
                background: 'var(--surface-3)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: 11,
                borderRadius: 6,
                padding: '3px 8px',
                whiteSpace: 'nowrap',
              }}
            >
              {d.weekLabel}: {d.count} completed
            </div>
            <span style={{ fontSize: 9, color: 'var(--muted)', marginTop: 4, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
              {d.weekLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ label, value, sub, valueColor }: {
  label: string;
  value: string | number;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <div style={{
      background: 'var(--surface-2)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '13px 14px',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04)',
    }}>
      <div style={{
        fontSize: 24,
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: '-.5px',
        color: valueColor ?? 'var(--text)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--body)', marginTop: 6 }}>
        {label}
        {sub && <span style={{ display: 'block', fontSize: 10, color: 'var(--muted)' }}>{sub}</span>}
      </div>
    </div>
  );
}

export default function AnalyticsPanel() {
  const analyticsPanelOpen = useKanbanStore((state) => state.openPanel === 'analytics');
  const boards = useKanbanStore((state) => state.boards);
  const activeBoard = useKanbanStore((state) => state.activeBoard);

  const board = boards.find((b) => b.id === activeBoard);
  const analytics = useMemo(() => (board ? computeBoardAnalytics(board) : null), [board]);
  const [velocityData, setVelocityData] = useState<{ weekLabel: string; count: number }[]>([]);

  const doneColumn = board?.columns
    .filter((c) => !c.archived)
    .find((c) => COMPLETED_COLUMN_KEYWORDS.some((kw) => c.title.toLowerCase().includes(kw)));

  useEffect(() => {
    if (!analyticsPanelOpen || !board || !doneColumn) {
      setVelocityData([]);
      return;
    }
    fetchCompletedByWeek(board.id, doneColumn.title).then(setVelocityData).catch(() => {});
  }, [analyticsPanelOpen, board?.id, doneColumn?.title]);

  return (
    <PanelShell
      open={analyticsPanelOpen}
      id="analytics-panel"
      title="Analytics"
      subtitle={board?.name}
      onClose={() => useKanbanStore.getState().setOpenPanel(null)}
    >
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 22 }}>
        {!analytics ? (
          <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '32px 0' }}>No board selected</p>
        ) : (
          <>
            {/* Key Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <StatCard label="Total cards" value={analytics.totalCards} />
              <StatCard
                label="Completion"
                value={`${analytics.completionRate}%`}
                valueColor={analytics.completionRate >= 75 ? 'var(--green)' : 'var(--purple-l)'}
              />
              <StatCard
                label="Overdue"
                value={analytics.overdueCount}
                valueColor={analytics.overdueCount > 0 ? 'var(--red)' : undefined}
              />
              <StatCard label="Due soon" value={analytics.dueSoonCount} sub="next 7 days" />
            </div>

            {/* Cards by Column */}
            {analytics.cardsByColumn.length > 0 && (
              <div>
                <div style={sectH}>Cards by Column</div>
                <BarChart
                  items={analytics.cardsByColumn.map((c) => ({ label: c.column, count: c.count, fill: 'var(--purple)' }))}
                  maxCount={Math.max(...analytics.cardsByColumn.map((c) => c.count), 1)}
                />
              </div>
            )}

            {/* Priority Distribution */}
            {analytics.cardsByPriority.length > 0 && (
              <div>
                <div style={sectH}>Priority Distribution</div>
                <BarChart
                  items={analytics.cardsByPriority.map((p) => ({
                    label: p.priority,
                    count: p.count,
                    fill: PRIORITY_FILL[p.priority] ?? 'var(--muted)',
                  }))}
                  maxCount={Math.max(...analytics.cardsByPriority.map((p) => p.count), 1)}
                />
              </div>
            )}

            {/* Top Tags */}
            {analytics.tagDistribution.length > 0 && (
              <div>
                <div style={sectH}>Top Tags</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {analytics.tagDistribution.map((t) => (
                    <span
                      key={t.tag}
                      style={{
                        fontSize: 11,
                        padding: '5px 10px',
                        borderRadius: 99,
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border-2)',
                        color: 'var(--body)',
                      }}
                    >
                      {t.tag}
                      <b style={{ color: 'var(--purple-l)', marginLeft: 4, fontWeight: 600 }}>{t.count}</b>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Checklist Progress */}
            {analytics.averageChecklistProgress > 0 && (
              <div>
                <div style={sectH}>Avg. Checklist Progress</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, height: 10, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      background: 'var(--purple)',
                      borderRadius: 99,
                      width: `${analytics.averageChecklistProgress}%`,
                      boxShadow: '0 0 12px var(--glow)',
                      transition: 'width 0.5s',
                    }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--purple-l)' }}>
                    {analytics.averageChecklistProgress}%
                  </span>
                </div>
              </div>
            )}

            {/* Activity Heatmap */}
            <div>
              <div style={sectH}>Activity (last 14 days)</div>
              <ActivityHeatmap data={analytics.activityHeatmap} />
              {analytics.activityHeatmap.some((d) => d.count > 0) && (
                <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>Cards updated per day</p>
              )}
            </div>

            {/* Weekly Velocity */}
            {doneColumn && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
                  <div style={sectH}>Weekly Velocity</div>
                  {velocityData.length > 0 && velocityData.some((d) => d.count > 0) && (
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {velocityData.reduce((s, d) => s + d.count, 0)} in 8 wks
                    </span>
                  )}
                </div>
                {velocityData.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>Loading…</p>
                ) : (
                  <>
                    <VelocityChart data={velocityData} />
                    {velocityData.some((d) => d.count > 0) && (
                      <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                        Cards completed per week (moved to &ldquo;{doneColumn.title}&rdquo;)
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Card Age */}
            {analytics.cardAgeBuckets.length > 0 && (
              <div>
                <div style={sectH}>Card Age</div>
                <BarChart
                  items={analytics.cardAgeBuckets.map((b) => ({
                    label: b.label,
                    count: b.count,
                    fill: CARD_AGE_FILL[b.label] ?? 'var(--green)',
                  }))}
                  maxCount={Math.max(...analytics.cardAgeBuckets.map((b) => b.count), 1)}
                />
              </div>
            )}
          </>
        )}
      </div>
    </PanelShell>
  );
}
