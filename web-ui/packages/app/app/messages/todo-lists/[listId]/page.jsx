import TodoItemsGrid from '@/components/todo/todo-items-grid';
import DashboardPage from '@/components/pages/dashboard-page';
const Page = async ({ params }) => {
    const { listId } = await params;
    return (<DashboardPage>
      <TodoItemsGrid listId={listId}/>
    </DashboardPage>);
};
export default Page;
//# sourceMappingURL=page.jsx.map