import TodoItemsGrid from '@/components/todo/todo-items-grid';
import DashboardPage from '@/components/pages/dashboard-page';

type Props = {
  params: Promise<{ listId: string }>;
};

const Page = async ({ params }: Props) => {
  const { listId } = await params;
  return (
    <DashboardPage>
      <TodoItemsGrid listId={listId} />
    </DashboardPage>
  );
};

export default Page;
