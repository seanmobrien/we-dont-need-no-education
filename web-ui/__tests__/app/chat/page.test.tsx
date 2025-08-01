import { render, screen } from '@/__tests__/test-utils';
import ChatPage from '@/app/chat/page';
import React from 'react';

// Mock the ChatList component
jest.mock('@/components/chat/list', () => {
  return function MockChatList() {
    return <div data-testid="chat-list">Mock Chat List</div>;
  };
});



// Mock the EmailDashboardLayout component
jest.mock('@/components/email-message/dashboard-layout/email-dashboard-layout', () => ({
  EmailDashboardLayout: ({ children, session }: React.PropsWithChildren<{ session: unknown }>) => (
    <div data-testid="email-dashboard-layout" data-session={JSON.stringify(session)}>
      {children}
    </div>
  ),
}));

import { auth } from '@/auth';

let authSpy: jest.SpyInstance<typeof auth>;

describe('Chat List Page', () => {
  const mockSession = {
    user: {
      id: 'user123',
      email: 'test@example.com',
      name: 'Test User',
    },
  };

  beforeEach(async () => {
    // jest.clearAllMocks();
    const authMod = await import('@/auth');
    jest.spyOn(authMod, 'auth').mockResolvedValue(mockSession);
    // (auth as jest.Mock).mockResolvedValue(mockSession);
  });

  it('should render chat list page with proper layout', async () => {
    const ChatPageComponent = await ChatPage();
    render(ChatPageComponent);
    
    expect(screen.getByTestId('email-dashboard-layout')).toBeInTheDocument();
    expect(screen.getByTestId('chat-list')).toBeInTheDocument();
  });

  it('should render with proper box styling', async () => {
    const ChatPageComponent = await ChatPage();
    render(ChatPageComponent);
    
    // Check that the Box component is rendered with proper structure
    const boxElement = screen.getByTestId('chat-list').parentElement;
    expect(boxElement).toHaveStyle('width: 100%');
  });


  it('should render ChatList component within the layout', async () => {
    const ChatPageComponent = await ChatPage();
    render(ChatPageComponent);
    
    // Verify the structure: Layout contains Box which contains ChatList
    const layoutElement = screen.getByTestId('email-dashboard-layout');
    const chatListElement = screen.getByTestId('chat-list');
    
    expect(layoutElement).toContainElement(chatListElement);
  });

  it('should have correct component hierarchy', async () => {
    const ChatPageComponent = await ChatPage();
    const { container } = render(ChatPageComponent);
    
    // Check the DOM structure
    expect(container.firstChild).toHaveAttribute('data-testid', 'email-dashboard-layout');
  });
});
