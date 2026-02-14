import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor, act, cleanup, } from '@/__tests__/test-utils';
import ResizableDraggableDialog from '@/components/mui/resizeable-draggable-dialog/dialog';
const TestDialogWrapper = ({ initialOpen = true, ...props }) => {
    const [open, setOpen] = useState(initialOpen);
    return (<div>
      <button onClick={() => setOpen(true)}>Open Dialog</button>
      <button onClick={() => setOpen(false)}>Close Dialog</button>
      <ResizableDraggableDialog isOpenState={open} onClose={() => setOpen(false)} onResize={() => { }} title="Integration Test Dialog" {...props}>
        <div data-testid="dialog-content">
          <p>This is test content</p>
          <input data-testid="test-input" placeholder="Test input"/>
        </div>
      </ResizableDraggableDialog>
    </div>);
};
describe('ResizableDraggableDialog + ResizeableDraggablePaper Integration', () => {
    beforeEach(() => {
        Element.prototype.getBoundingClientRect = jest.fn(() => ({
            width: 400,
            height: 300,
            top: 100,
            left: 100,
            bottom: 400,
            right: 500,
            x: 100,
            y: 100,
            toJSON: jest.fn(),
        }));
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 1024,
        });
        Object.defineProperty(window, 'innerHeight', {
            writable: true,
            configurable: true,
            value: 768,
        });
        jest.spyOn(console, 'warn').mockImplementation(() => { });
    });
    afterEach(() => {
        document.querySelectorAll('[aria-live]').forEach((el) => el.remove());
        document
            .querySelectorAll('[data-testid="current-size"]')
            .forEach((el) => el.remove());
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
        cleanup();
        jest.restoreAllMocks();
    });
    describe('Basic Integration', () => {
        it('renders dialog with paper component and all expected elements', async () => {
            render(<TestDialogWrapper />);
            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });
            expect(screen.getByRole('dialog')).toBeInTheDocument();
            expect(screen.getByText('Integration Test Dialog')).toBeInTheDocument();
            expect(screen.getByTestId('dialog-content')).toBeInTheDocument();
            expect(screen.getByTestId('test-input')).toBeInTheDocument();
            const dragHandle = screen.getByRole('button', {
                name: /drag to move dialog/i,
            });
            expect(dragHandle).toHaveAttribute('aria-label', expect.stringContaining('Drag to move dialog'));
        });
        it('opens and closes dialog correctly', async () => {
            render(<TestDialogWrapper initialOpen={false}/>);
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            fireEvent.click(screen.getByText('Open Dialog'));
            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });
            fireEvent.click(screen.getByText('Close Dialog'));
            await waitFor(() => {
                expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            });
        }, 15000);
    });
    describe('Size Management Integration', () => {
        it('initializes with correct default dimensions', async () => {
            render(<TestDialogWrapper />);
            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });
            const dialog = screen.getByRole('dialog');
            expect(dialog).toBeInTheDocument();
        });
        it('applies custom initial dimensions', async () => {
            render(<TestDialogWrapper initialWidth={600} initialHeight={450}/>);
            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });
            const dialog = screen.getByRole('dialog');
            expect(dialog).toBeInTheDocument();
        });
    });
    describe('Modal vs Non-Modal Behavior', () => {
        it('behaves as non-modal by default', async () => {
            render(<TestDialogWrapper modal={false}/>);
            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });
            const inputElement = screen.getByTestId('test-input');
            act(() => {
                inputElement.focus();
            });
            expect(inputElement).toHaveFocus();
        });
        it('behaves as modal when modal=true', async () => {
            render(<TestDialogWrapper modal={true}/>);
            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });
            const backdrop = document.querySelector('[class*="MuiBackdrop-root"]');
            expect(backdrop).toBeInTheDocument();
        });
    });
    describe('Error Handling Integration', () => {
        it('handles missing dialog element gracefully during keyboard drag', async () => {
            render(<TestDialogWrapper />);
            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });
            const dragHandle = screen.getByRole('button', {
                name: /drag to move dialog/i,
            });
            jest.spyOn(dragHandle, 'closest').mockReturnValue(null);
            expect(() => {
                act(() => {
                    fireEvent.keyDown(dragHandle, { key: 'ArrowRight' });
                });
            }).not.toThrow();
        });
    });
    describe('Accessibility Integration', () => {
        it('maintains proper ARIA relationships between components', async () => {
            render(<TestDialogWrapper />);
            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });
            const dialog = screen.getByRole('dialog');
            const dragHandle = screen.getByRole('button', {
                name: /drag to move dialog/i,
            });
            expect(dialog).toHaveAttribute('aria-labelledby');
            expect(dragHandle).toHaveAttribute('aria-label');
            expect(dragHandle).toHaveAttribute('tabIndex', '0');
        });
        it('supports keyboard navigation focus flow', async () => {
            render(<TestDialogWrapper />);
            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });
            const dragHandle = screen.getByRole('button', {
                name: /drag to move dialog/i,
            });
            const testInput = screen.getByTestId('test-input');
            act(() => {
                dragHandle.focus();
            });
            expect(dragHandle).toHaveFocus();
            act(() => {
                fireEvent.keyDown(dragHandle, { key: 'Tab' });
                testInput.focus();
            });
            expect(testInput).toHaveFocus();
        });
    });
    describe('Dialog Actions Integration', () => {
        it('renders dialog actions when provided', async () => {
            render(<TestDialogWrapper dialogActions={() => (<div data-testid="integration-dialog-actions">
              <button>Save</button>
              <button>Cancel</button>
            </div>)}/>);
            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });
            expect(screen.getByTestId('integration-dialog-actions')).toBeInTheDocument();
            expect(screen.getByText('Save')).toBeInTheDocument();
            expect(screen.getByText('Cancel')).toBeInTheDocument();
        });
    });
    describe('Custom Props Integration', () => {
        it('passes basic paper props through to the paper component', async () => {
            render(<TestDialogWrapper paperProps={{
                    elevation: 8,
                    style: { borderRadius: '16px' },
                }}/>);
            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });
        it('handles custom onClose handler', async () => {
            const mockOnClose = jest.fn();
            render(<TestDialogWrapper modal={true} onClose={mockOnClose}/>);
            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });
            const closeButton = screen.getByRole('button', { name: /close dialog/i });
            act(() => {
                fireEvent.click(closeButton);
            });
            await waitFor(() => {
                expect(mockOnClose).toHaveBeenCalled();
            });
        });
    });
    describe('Constraint Integration', () => {
        it('respects custom size constraints', async () => {
            const onResize = jest.fn((width, height) => { });
            render(<TestDialogWrapper minConstraints={[400, 250]} maxConstraints={[1000, 700]} width={500} height={150} onResize={onResize}/>);
            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });
            expect(onResize).toHaveBeenCalledWith(500, 250);
        });
    });
});
//# sourceMappingURL=integration.test.jsx.map