'use client';

import { BOARD_TEMPLATES, type BoardTemplate } from '@/lib/boardTemplates';

interface BoardTemplateSelectorProps {
  selected: string;
  onSelect: (template: BoardTemplate) => void;
}

export default function BoardTemplateSelector({ selected, onSelect }: BoardTemplateSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {BOARD_TEMPLATES.map((template) => (
        <button
          key={template.id}
          onClick={() => onSelect(template)}
          className={`text-left p-3 rounded-lg border-2 transition-all ${
            selected === template.id
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{template.icon}</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {template.name}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
            {template.description}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {template.columns.length} columns
          </p>
        </button>
      ))}
    </div>
  );
}
