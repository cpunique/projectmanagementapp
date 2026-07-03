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
          className="text-left p-3 rounded-lg border-2 transition-all"
          style={
            selected === template.id
              ? { borderColor: 'var(--purple)', background: 'rgba(147,51,234,.12)' }
              : { borderColor: 'var(--border)', background: 'var(--surface-2)' }
          }
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{template.icon}</span>
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              {template.name}
            </span>
          </div>
          <p className="text-xs line-clamp-1" style={{ color: 'var(--muted)' }}>
            {template.description}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
            {template.columns.length} columns
          </p>
        </button>
      ))}
    </div>
  );
}
