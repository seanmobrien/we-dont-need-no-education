import { render, screen, waitFor } from '@/__tests__/test-utils';
import ChatList from '@/components/ai/chat/list';
import { fetch } from '@/lib/nextjs-util/fetch';
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
        back: jest.fn(),
        forward: jest.fn(),
        refresh: jest.fn(),
        replace: jest.fn(),
        prefetch: jest.fn(),
    }),
}));
jest.mock('@/components/mui/data-grid/server-bound-data-grid', () => ({
    ServerBoundDataGrid: ({ url, columns, onRowDoubleClick, ...props }) => (<div data-testid="server-bound-data-grid" data-url={url} role="grid">
      <div>Mock Data Grid</div>
      {columns.map((col, index) => (<div key={index} data-testid={`column-${col.field}`}>
          {col.headerName}
        </div>))}
    </div>),
}));
jest.mock('@/lib/site-util/url-builder', () => ({
    __esModule: true,
    default: {
        api: {
            ai: {
                chat: {
                    history: () => new URL('http://localhost:3000/api/ai/chat/history'),
                },
            },
        },
    },
}));
describe('ChatList', () => {
    jest.setTimeout(30000);
    beforeEach(() => {
        fetch.mockClear();
    });
    it('should render initially without errors', () => {
        render(<ChatList />);
        expect(screen.getByRole('grid')).toBeInTheDocument();
        expect(screen.getByText('Mock Data Grid')).toBeInTheDocument();
    });
    it('should render chat list with data grid', async () => {
        render(<ChatList />);
        await waitFor(() => {
            expect(screen.getByRole('grid')).toBeInTheDocument();
        });
        expect(screen.getByTestId('server-bound-data-grid')).toBeInTheDocument();
    });
    it('should display correct column headers', () => {
        render(<ChatList />);
        expect(screen.getByTestId('column-title')).toHaveTextContent('Chat Title');
        expect(screen.getByTestId('column-createdAt')).toHaveTextContent('Created');
    });
    it('should use correct API endpoint', () => {
        render(<ChatList />);
        const dataGrid = screen.getByTestId('server-bound-data-grid');
        expect(dataGrid).toHaveAttribute('data-url', 'http://localhost:3000/api/ai/chat/history');
    });
    it('should render with custom maxHeight', () => {
        render(<ChatList maxHeight={500}/>);
        expect(screen.getByRole('grid')).toBeInTheDocument();
    });
    it('should handle double click props', () => {
        const onRowDoubleClick = jest.fn();
        render(<ChatList onRowDoubleClick={onRowDoubleClick}/>);
        expect(screen.getByRole('grid')).toBeInTheDocument();
    });
    it('should render with proper box structure', () => {
        const { container } = render(<ChatList />);
        const boxElement = container.firstChild;
        expect(boxElement).toHaveStyle('display: flex');
        expect(boxElement).toHaveStyle('flex-direction: column');
        expect(boxElement).toHaveStyle('width: 100%');
    });
    it('should configure columns correctly', () => {
        render(<ChatList />);
        const titleColumn = screen.getByTestId('column-title');
        expect(titleColumn).toBeInTheDocument();
        const createdColumn = screen.getByTestId('column-createdAt');
        expect(createdColumn).toBeInTheDocument();
    });
    it('should handle component props correctly', () => {
        const customProps = {
            maxHeight: 800,
            'data-testid': 'custom-chat-list',
        };
        render(<ChatList {...customProps}/>);
        expect(screen.getByRole('grid')).toBeInTheDocument();
    });
    it('should add viewType query parameter for system view', () => {
        render(<ChatList viewType="system"/>);
        const dataGrid = screen.getByTestId('server-bound-data-grid');
        expect(dataGrid).toHaveAttribute('data-url', 'http://localhost:3000/api/ai/chat/history?viewType=system');
    });
    it('should not add viewType query parameter for default user view', () => {
        render(<ChatList viewType="user"/>);
        const dataGrid = screen.getByTestId('server-bound-data-grid');
        expect(dataGrid).toHaveAttribute('data-url', 'http://localhost:3000/api/ai/chat/history');
    });
});
//# sourceMappingURL=list.test.jsx.map