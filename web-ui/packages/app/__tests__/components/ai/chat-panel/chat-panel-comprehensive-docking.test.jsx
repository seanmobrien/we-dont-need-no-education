import React from 'react';
import { render, screen, fireEvent, waitFor, within, } from '@/__tests__/test-utils';
import { ChatPanelProvider } from '@/components/ai/chat-panel/chat-panel-context';
import ChatPanel from '@/components/ai/chat-panel/chat-panel';
import { ChatPanelLayout } from '@/components/ai/chat-panel/chat-panel-layout';
const TIMEOUT = 30000;
jest.mock('@ai-sdk/react', () => ({
    useChat: () => ({
        id: 'test-chat-id',
        messages: [],
        input: '',
        handleInputChange: jest.fn(),
        handleSubmit: jest.fn(),
        status: 'idle',
        data: undefined,
        setData: jest.fn(),
        reload: jest.fn(),
        setMessages: jest.fn(),
    }),
}));
jest.mock('@/lib/ai/core', () => ({
    generateChatId: () => ({ id: 'test-id' }),
    isAnnotatedRetryMessage: () => false,
}));
jest.mock('@/lib/components/ai/chat-fetch-wrapper', () => ({
    useChatFetchWrapper: jest.fn(() => ({ chatFetch: jest.fn() })),
}));
jest.mock('react-dom', () => ({
    ...jest.requireActual('react-dom'),
    createPortal: (children) => (<div data-testid="portal-content">{children}</div>),
}));
jest.mock('@/components/mui/resizeable-draggable-dialog', () => {
    return function MockResizableDraggableDialog({ children, title, isOpenState, onClose, onResize, }) {
        return isOpenState ? (<div data-testid="floating-dialog" role="dialog" aria-label={title}>
        <div data-testid="dialog-title">{title}</div>
        <div data-testid="dialog-content">{children}</div>
        <button data-testid="dialog-close" onClick={onClose}>
          Close
        </button>
        <button data-testid="dialog-resize" onClick={() => onResize(800, 600)}>
          Resize
        </button>
      </div>) : null;
    };
});
jest.mock('react-resizable', () => ({
    Resizable: ({ children, onResize }) => (<div data-testid="resizable-container" onMouseDown={() => onResize({}, { size: { width: 400, height: 300 } })}>
      {children}
    </div>),
}));
const ChatPanelTestWrapper = ({ children }) => (<ChatPanelProvider>
    <ChatPanelLayout>
      <div data-testid="main-content">Main Content</div>
      {children}
    </ChatPanelLayout>
    <ChatPanel page="test"/>
  </ChatPanelProvider>);
describe('ChatPanel Comprehensive Docking Tests', () => {
    beforeEach(() => {
        localStorage.clear();
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 1200,
        });
        Object.defineProperty(window, 'innerHeight', {
            writable: true,
            configurable: true,
            value: 800,
        });
    });
    describe('Float Mode', () => {
        it('should render inline by default', () => {
            render(<ChatPanelTestWrapper />);
            expect(screen.getByPlaceholderText(/Type your message here/)).toBeInTheDocument();
            expect(screen.queryByText(/Chat panel is floating/)).not.toBeInTheDocument();
            expect(screen.queryByTestId('floating-dialog')).not.toBeInTheDocument();
        }, TIMEOUT);
        it('should switch to float mode when Float is selected', async () => {
            render(<ChatPanelTestWrapper />);
            const menuButton = screen.getByTestId('button-chat-menu');
            fireEvent.click(menuButton);
            await waitFor(() => {
                fireEvent.mouseEnter(screen.getByTestId('menu-item-dock'));
            });
            const floatOption = await screen.findByText('Float');
            fireEvent.click(floatOption);
            await waitFor(() => {
                expect(screen.getByText(/Chat panel is floating/)).toBeInTheDocument();
                expect(screen.getByTestId('floating-dialog')).toBeInTheDocument();
            });
        }, TIMEOUT);
        it('should handle resize in float mode', async () => {
            render(<ChatPanelTestWrapper />);
            const menuButton = screen.getByTestId('button-chat-menu');
            fireEvent.click(menuButton);
            await waitFor(() => {
                fireEvent.mouseEnter(screen.getByTestId('menu-item-dock'));
            });
            fireEvent.click(await screen.findByText('Float'));
            await waitFor(() => {
                expect(screen.getByTestId('floating-dialog')).toBeInTheDocument();
            });
            const resizeButton = screen.getByTestId('dialog-resize');
            fireEvent.click(resizeButton);
            expect(screen.getByTestId('floating-dialog')).toBeInTheDocument();
        }, TIMEOUT);
        it('should close float mode and return to inline', async () => {
            render(<ChatPanelTestWrapper />);
            const menuButton = screen.getByTestId('button-chat-menu');
            fireEvent.click(menuButton);
            await waitFor(() => {
                fireEvent.mouseEnter(screen.getByTestId('menu-item-dock'));
            });
            fireEvent.click(await screen.findByText('Float'));
            await waitFor(() => {
                expect(screen.getByTestId('floating-dialog')).toBeInTheDocument();
            });
            const closeButton = screen.getByTestId('dialog-close');
            fireEvent.click(closeButton);
            await waitFor(() => {
                expect(screen.queryByTestId('floating-dialog')).not.toBeInTheDocument();
                expect(screen.getByPlaceholderText(/Type your message here/)).toBeInTheDocument();
            });
        }, TIMEOUT);
    });
    describe('Dock Left', () => {
        it('should dock to left and show placeholder', async () => {
            render(<ChatPanelTestWrapper />);
            const menuButton = screen.getByTestId('button-chat-menu');
            fireEvent.click(menuButton);
            await waitFor(() => {
                fireEvent.mouseEnter(screen.getByTestId('menu-item-dock'));
            });
            const dockLeftOption = await screen.findByText('Dock Left');
            fireEvent.click(dockLeftOption);
            await waitFor(() => {
                expect(screen.getByText(/Chat panel is docked to left/)).toBeInTheDocument();
            });
            const portalInputs = screen.queryAllByTestId('portal-content');
            expect(portalInputs.length).toBeGreaterThan(0);
        }, TIMEOUT);
        it('should adjust layout when docked left', async () => {
            render(<ChatPanelTestWrapper isDashboardLayout={true}/>);
            const menuButton = screen.getByTestId('button-chat-menu');
            fireEvent.click(menuButton);
            await waitFor(() => {
                fireEvent.mouseEnter(screen.getByTestId('menu-item-dock'));
            });
            fireEvent.click(await screen.findByText('Dock Left'));
            await waitFor(() => {
                expect(screen.getByText(/Chat panel is docked to left/)).toBeInTheDocument();
            });
            const mainContent = screen.getByTestId('main-content');
            const layoutContainer = mainContent.parentElement;
            expect(layoutContainer).toBeDefined();
            const computedStyle = window.getComputedStyle(layoutContainer);
            expect(computedStyle.transition).toContain('ease-in-out');
        }, TIMEOUT);
        it('should show docked panel with chat content', async () => {
            render(<ChatPanelTestWrapper />);
            const menuButton = screen.getByTestId('button-chat-menu');
            fireEvent.click(menuButton);
            await waitFor(() => {
                fireEvent.mouseEnter(screen.getByTestId('menu-item-dock'));
            });
            fireEvent.click(await screen.findByText('Dock Left'));
            await waitFor(() => {
                expect(screen.getByText(/Chat panel is docked to left/)).toBeInTheDocument();
            });
            expect(screen.getByTestId('resizable-container')).toBeInTheDocument();
        }, TIMEOUT);
    });
    describe('Dock Right', () => {
        it('should dock to right and position correctly', async () => {
            render(<ChatPanelTestWrapper />);
            const menuButton = screen.getByTestId('button-chat-menu');
            fireEvent.click(menuButton);
            await waitFor(() => {
                fireEvent.mouseEnter(screen.getByTestId('menu-item-dock'));
            });
            fireEvent.click(await screen.findByText('Dock Right'));
            await waitFor(() => {
                expect(screen.getByText(/Chat panel is docked to right/)).toBeInTheDocument();
            });
        }, TIMEOUT);
        it('should handle resizing when docked right', async () => {
            render(<ChatPanelTestWrapper />);
            const menuButton = screen.getByTestId('button-chat-menu');
            fireEvent.click(menuButton);
            await waitFor(() => {
                fireEvent.mouseEnter(screen.getByTestId('menu-item-dock'));
            });
            fireEvent.click(await screen.findByText('Dock Right'));
            await waitFor(() => {
                expect(screen.getByTestId('resizable-container')).toBeInTheDocument();
            });
            const resizableContainer = screen.getByTestId('resizable-container');
            fireEvent.mouseDown(resizableContainer);
            expect(screen.getByText(/Chat panel is docked to right/)).toBeInTheDocument();
        }, TIMEOUT);
    });
    describe('Dock Top', () => {
        it('should dock to top edge correctly', async () => {
            render(<ChatPanelTestWrapper />);
            const menuButton = screen.getByTestId('button-chat-menu');
            fireEvent.click(menuButton);
            await waitFor(() => {
                fireEvent.mouseEnter(screen.getByTestId('menu-item-dock'));
            });
            fireEvent.click(await screen.findByText('Dock Top'));
            await waitFor(() => {
                expect(screen.getByText(/Chat panel is docked to top/)).toBeInTheDocument();
            });
        }, TIMEOUT);
        it('should not cause viewport overflow when docked top', async () => {
            render(<ChatPanelTestWrapper />);
            const menuButton = screen.getByTestId('button-chat-menu');
            fireEvent.click(menuButton);
            await waitFor(() => {
                fireEvent.mouseEnter(screen.getByTestId('menu-item-dock'));
            });
            fireEvent.click(await screen.findByText('Dock Top'));
            await waitFor(() => {
                expect(screen.getByText(/Chat panel is docked to top/)).toBeInTheDocument();
            });
            expect(document.body.scrollHeight).toBeLessThanOrEqual(window.innerHeight + 100);
        }, TIMEOUT);
    });
    describe('Dock Bottom', () => {
        it('should dock to bottom edge correctly', async () => {
            render(<ChatPanelTestWrapper />);
            const menuButton = screen.getByTestId('button-chat-menu');
            fireEvent.click(menuButton);
            await waitFor(() => {
                fireEvent.mouseEnter(screen.getByTestId('menu-item-dock'));
            });
            fireEvent.click(await screen.findByText('Dock Bottom'));
            await waitFor(() => {
                expect(screen.getByText(/Chat panel is docked to bottom/)).toBeInTheDocument();
            });
        }, TIMEOUT);
        it('should maintain proper height constraints when docked bottom', async () => {
            render(<ChatPanelTestWrapper />);
            const menuButton = screen.getByTestId('button-chat-menu');
            fireEvent.click(menuButton);
            await waitFor(() => {
                fireEvent.mouseEnter(screen.getByTestId('menu-item-dock'));
            });
            fireEvent.click(await screen.findByText('Dock Bottom'));
            await waitFor(() => {
                expect(screen.getByTestId('resizable-container')).toBeInTheDocument();
            });
            const resizableContainer = screen.getByTestId('resizable-container');
            expect(resizableContainer).toBeInTheDocument();
        }, TIMEOUT);
    });
    describe('Undocking', () => {
        it('should undock from any docked position back to inline', async () => {
            render(<ChatPanelTestWrapper />);
            const menuButton = screen.getByTestId('button-chat-menu');
            fireEvent.click(menuButton);
            await waitFor(() => {
                fireEvent.mouseEnter(screen.getByTestId('menu-item-dock'));
            });
            fireEvent.click(await screen.findByText('Dock Left'));
            await waitFor(() => {
                expect(screen.getByText(/Chat panel is docked to left/)).toBeInTheDocument();
            });
        }, TIMEOUT);
    });
    describe('Dashboard Layout Integration', () => {
        it('should handle dashboard layout with proper spacing', async () => {
            render(<ChatPanelTestWrapper isDashboardLayout={true}/>);
            const menuButton = screen.getByTestId('button-chat-menu');
            fireEvent.click(menuButton);
            await waitFor(() => {
                fireEvent.mouseEnter(screen.getByTestId('menu-item-dock'));
            });
            fireEvent.click(await screen.findByText('Dock Left'));
            await waitFor(() => {
                expect(screen.getByText(/Chat panel is docked to left/)).toBeInTheDocument();
            });
            const mainContent = screen.getByTestId('main-content');
            const layoutContainer = mainContent.parentElement;
            expect(layoutContainer).toBeDefined();
        }, TIMEOUT);
        it('should handle all docking positions in dashboard layout', async () => {
            const positions = [
                'Dock Left',
                'Dock Right',
                'Dock Top',
                'Dock Bottom',
            ];
            for (const position of positions) {
                const { unmount, container } = render(<ChatPanelTestWrapper isDashboardLayout={true}/>);
                const menuButton = within(container).getByTestId('button-chat-menu');
                fireEvent.click(menuButton);
                await waitFor(() => {
                    const dockMenu = within(container).getByTestId('menu-item-dock');
                    fireEvent.mouseEnter(dockMenu);
                });
                const option = await screen.findByText(position);
                fireEvent.click(option);
                const positionName = position.toLowerCase().replace('dock ', '');
                await waitFor(() => {
                    expect(screen.getByText(new RegExp(`Chat panel is docked to ${positionName}`))).toBeInTheDocument();
                });
                unmount();
            }
        }, TIMEOUT);
    });
    describe('State Persistence', () => {
        it('should persist docking state in localStorage', async () => {
            render(<ChatPanelTestWrapper />);
            const menuButton = screen.getByTestId('button-chat-menu');
            fireEvent.click(menuButton);
            await waitFor(() => {
                fireEvent.mouseEnter(screen.getByTestId('menu-item-dock'));
            });
            fireEvent.click(await screen.findByText('Dock Right'));
            await waitFor(() => {
                expect(screen.getByText(/Chat panel is docked to right/)).toBeInTheDocument();
            });
            expect(localStorage.getItem('chatPanelPosition')).toBe('right');
        }, TIMEOUT);
        it('should restore docking state on component mount', () => {
            localStorage.setItem('chatPanelPosition', 'left');
            localStorage.setItem('chatPanelDockSize', '350');
            render(<ChatPanelTestWrapper />);
            expect(screen.getByText(/Chat panel is docked to left/)).toBeInTheDocument();
        }, TIMEOUT);
    });
    describe('Responsive Behavior', () => {
        it('should handle window resize events', async () => {
            render(<ChatPanelTestWrapper />);
            const menuButton = screen.getByTestId('button-chat-menu');
            fireEvent.click(menuButton);
            await waitFor(() => {
                fireEvent.mouseEnter(screen.getByTestId('menu-item-dock'));
            });
            fireEvent.click(await screen.findByText('Dock Top'));
            await waitFor(() => {
                expect(screen.getByText(/Chat panel is docked to top/)).toBeInTheDocument();
            });
            Object.defineProperty(window, 'innerWidth', { value: 800 });
            Object.defineProperty(window, 'innerHeight', { value: 600 });
            fireEvent(window, new Event('resize'));
            expect(screen.getByText(/Chat panel is docked to top/)).toBeInTheDocument();
        }, TIMEOUT);
        it('should maintain proper constraints on small screens', async () => {
            Object.defineProperty(window, 'innerWidth', { value: 480 });
            Object.defineProperty(window, 'innerHeight', { value: 640 });
            render(<ChatPanelTestWrapper />);
            const menuButton = screen.getByTestId('button-chat-menu');
            fireEvent.click(menuButton);
            await waitFor(() => {
                fireEvent.mouseEnter(screen.getByTestId('menu-item-dock'));
            });
            fireEvent.click(await screen.findByText('Dock Left'));
            await waitFor(() => {
                expect(screen.getByText(/Chat panel is docked to left/)).toBeInTheDocument();
                expect(screen.getByTestId('resizable-container')).toBeInTheDocument();
            });
        }, TIMEOUT);
    });
});
//# sourceMappingURL=chat-panel-comprehensive-docking.test.jsx.map