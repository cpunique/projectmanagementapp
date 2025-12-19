'use client';

import { motion } from 'framer-motion';
import { useKanbanStore } from '@/lib/store';

interface DueDatePanelToggleButtonProps {
  badge?: number;
}

export function DueDatePanelToggleButton({ badge = 0 }: DueDatePanelToggleButtonProps) {
  const { dueDatePanelOpen, toggleDueDatePanel } = useKanbanStore();

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleDueDatePanel}
      aria-label="Toggle due dates panel"
      aria-expanded={dueDatePanelOpen}
      className={`
        fixed bottom-6 right-6 z-40 md:absolute md:right-4 md:top-4
        w-14 h-14 rounded-full shadow-lg transition-all
        flex items-center justify-center text-xl font-bold
        ${dueDatePanelOpen
          ? 'bg-purple-600 text-white'
          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-400'
        }
      `}
    >
      📅

      {/* Badge */}
      {badge > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`
            absolute -top-1 -right-1 w-6 h-6 rounded-full
            bg-red-500 text-white text-xs font-bold
            flex items-center justify-center
          `}
        >
          {badge > 9 ? '9+' : badge}
        </motion.span>
      )}
    </motion.button>
  );
}
