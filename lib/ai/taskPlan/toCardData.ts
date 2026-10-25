// The fields the review step hands to the existing addCard action for one generated
// task. Kept as a function so the modal and the tests use exactly the same mapping.

export interface GeneratedTaskFields {
  title: string;
  priority: 'low' | 'medium' | 'high';
  description: string;
  checklist?: string[];
  notes?: string;
  tags?: string[];
  color?: string;
}

export function taskToCardData(task: GeneratedTaskFields, dueDate: string | undefined, checklistIdPrefix: string) {
  return {
    title: task.title,
    priority: task.priority,
    description: task.description,
    ...(task.checklist && task.checklist.length > 0 && {
      checklist: task.checklist.map((text, i) => ({ id: `${checklistIdPrefix}-${i}`, text, completed: false, order: i })),
    }),
    ...(task.notes && { notes: task.notes }),
    ...(task.tags && task.tags.length > 0 && { tags: task.tags }),
    ...(task.color && { color: task.color }),
    ...(dueDate && { dueDate }),
  };
}
