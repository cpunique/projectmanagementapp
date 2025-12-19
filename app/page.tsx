import KanbanBoard from '@/components/kanban/KanbanBoard';
import { BoardWithPanel } from '@/components/layout/BoardWithPanel';

export default function Home() {
  return (
    <BoardWithPanel>
      <KanbanBoard />
    </BoardWithPanel>
  );
}
