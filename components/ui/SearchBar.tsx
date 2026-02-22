'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useKanbanStore } from '@/lib/store';
import Tooltip from '@/components/ui/Tooltip';

export default function SearchBar() {
  const searchQuery = useKanbanStore((state) => state.searchQuery);
  const setSearchQuery = useKanbanStore((state) => state.setSearchQuery);
  const filters = useKanbanStore((state) => state.filters);
  const setFilters = useKanbanStore((state) => state.setFilters);
  const clearFilters = useKanbanStore((state) => state.clearFilters);

  const [localValue, setLocalValue] = useState(searchQuery);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync local value when store resets (e.g., board switch)
  useEffect(() => {
    if (searchQuery === '' && localValue !== '') {
      setLocalValue('');
    }
  }, [searchQuery]);

  // Close filter dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleChange = useCallback((value: string) => {
    setLocalValue(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(value);
    }, 300);
  }, [setSearchQuery]);

  const handleClear = () => {
    setLocalValue('');
    setSearchQuery('');
    clearFilters();
    setShowFilters(false);
  };

  const handleExpand = () => {
    setIsExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Don't collapse if focus moved to another element inside our container
    if (containerRef.current?.contains(e.relatedTarget as Node)) return;
    if (!localValue && !showFilters && !hasFilters) {
      setIsExpanded(false);
    }
  };

  const togglePriority = (priority: 'low' | 'medium' | 'high') => {
    const current = filters.priorities || [];
    const updated = current.includes(priority)
      ? current.filter((p) => p !== priority)
      : [...current, priority];
    setFilters({ ...filters, priorities: updated.length > 0 ? updated : undefined });
  };

  const toggleOverdue = () => {
    setFilters({ ...filters, showOverdue: !filters.showOverdue });
  };

  const activePriorityCount = filters.priorities?.length || 0;
  const hasFilters = activePriorityCount > 0 || !!filters.showOverdue;

  // Collapsed state: just a search icon button
  if (!isExpanded) {
    return (
      <Tooltip position="bottom" text="Search cards (Ctrl+/)">
        <button
          onClick={handleExpand}
          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400 relative"
          aria-label="Search cards"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {hasFilters && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-purple-600" />
          )}
        </button>
      </Tooltip>
    );
  }

  return (
    <div ref={containerRef} className="relative flex items-center gap-1">
      {/* Search Input */}
      <div className="relative">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              handleClear();
              setIsExpanded(false);
            }
          }}
          placeholder="Search cards..."
          className="w-44 h-8 pl-8 pr-7 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
        />
        {localValue && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Clear search"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Filter Toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className={`p-1.5 rounded-lg transition-colors ${
          hasFilters
            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
            : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
        }`}
        aria-label="Toggle filters"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
      </button>

      {/* Filter Dropdown */}
      {showFilters && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 p-3">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Priority
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {(['high', 'medium', 'low'] as const).map((p) => (
              <button
                key={p}
                onClick={() => togglePriority(p)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  filters.priorities?.includes(p)
                    ? p === 'high'
                      ? 'bg-red-600 text-white'
                      : p === 'medium'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-green-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {p === 'high' ? 'High' : p === 'medium' ? 'Medium' : 'Low'}
              </button>
            ))}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!filters.showOverdue}
                onChange={toggleOverdue}
                className="rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-xs text-gray-700 dark:text-gray-300">Overdue only</span>
            </label>
          </div>

          {hasFilters && (
            <button
              onClick={() => { clearFilters(); setShowFilters(false); }}
              className="mt-2 w-full text-xs text-center text-purple-600 dark:text-purple-400 hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
