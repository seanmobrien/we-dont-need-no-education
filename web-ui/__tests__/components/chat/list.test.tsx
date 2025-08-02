import { render, screen, waitFor } from '@/__tests__/test-utils';
import ChatList from '@/components/chat/list';
import { mockChatSummaries, mockChatHistoryResponse } from '../chat.mock-data';

// Mock the router
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

// Mock the ServerBoundDataGrid component to avoid validation issues
jest.mock('@/components/mui/data-grid/server-bound-data-grid', () => ({
  ServerBoundDataGrid: ({ url, columns, onRowDoubleClick, ...props }: any) => (
    <div data-testid="server-bound-data-grid" data-url={url} role="grid">
      <div>Mock Data Grid</div>
      {columns.map((col: any, index: number) => (
        <div key={index} data-testid={`column-${col.field}`}>
          {col.headerName}
        </div>
      ))}
    </div>
  ),
}));

// Mock the siteMap
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
  const mockFetch = jest.fn();
  
  // Set a shorter timeout for all tests in this suite
  jest.setTimeout(30000);

  beforeAll(() => {
    global.fetch = mockFetch;
  });

  beforeEach(() => {
    // jest.clearAllMocks();
    global.fetch = mockFetch;
  });

  it('should render initially without errors', () => {
    render(<ChatList />);
    
    expect(screen.getByRole('grid')).toBeInTheDocument();
    expect(screen.getByText('Mock Data Grid')).toBeInTheDocument();
  });

  it('should render chat list with data grid', async () => {
    render(<ChatList />);

    // Wait for the component to render
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
    render(<ChatList maxHeight={500} />);
    
    // The component should render without errors
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('should handle double click props', () => {
    const onRowDoubleClick = jest.fn();
    render(<ChatList onRowDoubleClick={onRowDoubleClick} />);

    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('should render with proper box structure', () => {
    const { container } = render(<ChatList />);
    
    // Check that the Box component structure is present
    const boxElement = container.firstChild;
    expect(boxElement).toHaveStyle('display: flex');
    expect(boxElement).toHaveStyle('flex-direction: column');
    expect(boxElement).toHaveStyle('width: 100%');
  });

  it('should configure columns correctly', () => {
    render(<ChatList />);

    // Title column should be present and configured as a link
    const titleColumn = screen.getByTestId('column-title');
    expect(titleColumn).toBeInTheDocument();

    // Created date column should be present
    const createdColumn = screen.getByTestId('column-createdAt');
    expect(createdColumn).toBeInTheDocument();
  });

  it('should handle component props correctly', () => {
    const customProps = {
      maxHeight: 800,
      'data-testid': 'custom-chat-list',
    };

    render(<ChatList {...customProps} />);

    expect(screen.getByRole('grid')).toBeInTheDocument();
  });
});
