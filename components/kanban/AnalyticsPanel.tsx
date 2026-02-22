'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKanbanStore } from '@/lib/store';
import { computeBoardAnalytics } from '@/lib/utils/analytics';
import { fetchCompletedByWeek } from '@/lib/firebase/activities';
import { COMPLETED_COLUMN_KEYWORDS } from '@/lib/constants';

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
  none: 'bg-gray-400',
};

function VelocityChart({ data }: { data: { weekLabel: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1 h-20">
      {data.map((d) => (
        <div key={d.weekLabel} className="flex flex-col items-center flex-1 h-full justify-end group relative">
          <div
            className="w-full rounded-sm bg-green-500 dark:bg-green-400 transition-all duration-500"
            style={{
              height: `${Math.max((d.count / max) * 64, d.count > 0 ? 4 : 2)}px`,
              opacity: d.count === 0 ? 0.2 : 1,
            }}
          />
          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 text-xs rounded px-1.5 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            {d.weekLabel}: {d.count} completed
          </div>
          <span className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5 truncate w-full text-center">
            {d.weekLabel}
          </span>
        </div>
      ))}
    </div>
  );
}

function BarChart({ items, maxCount }: { items: { label: string; count: number; color?: string }[]; maxCount: number }) {
  if (maxCount === 0) return null;
  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className="text-xs text-gray-600 dark:text-gray-400 w-20 truncate text-right" title={item.label}>
            {item.label}
          </span>
          <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
            <div
              className={`h-full rounded transition-all duration-500 ${item.color || 'bg-purple-500'}`}
              style={{ width: `${(item.count / maxCount) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 w-6 text-right tabular-nums">{item.count}</span>
        </div>
      ))}
    </div>
  );
}

function ActivityHeatmap({ data }: { data: { date: string; label: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-0.5 h-16">
      {data.map((d, i) => (
        <div key={d.date} className="flex flex-col items-center flex-1 h-full justify-end group relative">
          <div
            className="w-full rounded-sm bg-purple-500 dark:bg-purple-400 transition-all duration-500"
            style={{ height: `${Math.max((d.count / max) * 52, d.count > 0 ? 4 : 2)}px`, opacity: d.count === 0 ? 0.15 : 1 }}
          />
          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 text-xs rounded px-1.5 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            {d.label}: {d.count}
          </div>
          {i % 7 === 0 && (
            <span className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5 truncate w-full text-center">{d.label}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, subtext, color }: { label: string; value: string | number; subtext?: string; color?: string }) {
  return (
    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
      <div className={`text-2xl font-bold tabular-nums ${color || 'text-gray-900 dark:text-white'}`}>{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</div>
      {subtext && <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subtext}</div>}
    </div>
  );
}

export default function AnalyticsPanel() {
  const analyticsPanelOpen = useKanbanStore((state) => state.analyticsPanelOpen);
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
    <AnimatePresence>
      {analyticsPanelOpen && (
        <motion.div
          id="analytics-panel"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{ width: '320px' }}
          className={`
            flex flex-col border-l border-gray-200 dark:border-gray-700
            bg-white dark:bg-gray-800 h-full
            overflow-hidden md:static fixed right-0 top-16 z-30 bottom-0
            md:relative
          `}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Analytics</h2>
              {board && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{board.name}</p>
              )}
            </div>
            <button
              onClick={() => useKanbanStore.getState().setAnalyticsPanelOpen(false)}
              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Close analytics panel"
            >
              <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
            {!analytics ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No board selected</p>
            ) : (
              <>
                {/* Key Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <StatCard label="Total cards" value={analytics.totalCards} />
                  <StatCard
                    label="Completion"
                    value={`${analytics.completionRate}%`}
                    color={analytics.completionRate >= 75 ? 'text-green-600 dark:text-green-400' : undefined}
                  />
                  <StatCard
                    label="Overdue"
                    value={analytics.overdueCount}
                    color={analytics.overdueCount > 0 ? 'text-red-600 dark:text-red-400' : undefined}
                  />
                  <StatCard label="Due soon" value={analytics.dueSoonCount} subtext="next 7 days" />
                </div>

                {/* Cards by Column */}
                {analytics.cardsByColumn.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Cards by Column</h3>
                    <BarChart
                      items={analytics.cardsByColumn.map((c) => ({ label: c.column, count: c.count }))}
                      maxCount={Math.max(...analytics.cardsByColumn.map((c) => c.count), 1)}
                    />
                  </div>
                )}

                {/* Cards by Priority */}
                {analytics.cardsByPriority.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Priority Distribution</h3>
                    <BarChart
                      items={analytics.cardsByPriority.map((p) => ({
                        label: p.priority,
                        count: p.count,
                        color: PRIORITY_COLORS[p.priority],
                      }))}
                      maxCount={Math.max(...analytics.cardsByPriority.map((p) => p.count), 1)}
                    />
                  </div>
                )}

                {/* Top Tags */}
                {analytics.tagDistribution.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Top Tags</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {analytics.tagDistribution.map((t) => (
                        <span
                          key={t.tag}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                        >
                          {t.tag}
                          <span className="text-purple-500 dark:text-purple-400 tabular-nums">{t.count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Checklist Progress */}
                {analytics.averageChecklistProgress > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Avg. Checklist Progress</h3>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full transition-all duration-500"
                          style={{ width: `${analytics.averageChecklistProgress}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 tabular-nums">
                        {analytics.averageChecklistProgress}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Activity Heatmap — last 14 days */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Activity (last 14 days)</h3>
                  <ActivityHeatmap data={analytics.activityHeatmap} />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Cards updated per day</p>
                </div>

                {/* Weekly Velocity */}
                {doneColumn && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Weekly Velocity
                      </h3>
                      {velocityData.length > 0 && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                          {velocityData.reduce((s, d) => s + d.count, 0)} in 8 wks
                        </span>
                      )}
                    </div>
                    {velocityData.length > 0 ? (
                      <>
                        <VelocityChart data={velocityData} />
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          Cards completed per week (moved to &ldquo;{doneColumn.title}&rdquo;)
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-400 dark:text-gray-500 italic">Loading…</p>
                    )}
                  </div>
                )}

                {/* Card Age Distribution */}
                {analytics.cardAgeBuckets.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Card Age</h3>
                    <BarChart
                      items={analytics.cardAgeBuckets.map((b) => ({
                        label: b.label,
                        count: b.count,
                        color: b.label === '> 30 days' ? 'bg-orange-400' : b.label === '7–30 days' ? 'bg-yellow-400' : 'bg-green-500',
                      }))}
                      maxCount={Math.max(...analytics.cardAgeBuckets.map((b) => b.count), 1)}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
