import KanbanBoard from '@/components/kanban/KanbanBoard';
import { BoardWithPanel } from '@/components/layout/BoardWithPanel';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <BoardWithPanel>
      <KanbanBoard />
    </BoardWithPanel>
  );
}
