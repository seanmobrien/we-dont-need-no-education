import React from 'react';
import { render, screen } from '@/__tests__/test-utils';
import ResizableDraggableDialog from '@/components/mui/resizeable-draggable-dialog/dialog';
jest.mock('/components/mui/resizeable-draggable-dialog/resizeable-draggable-paper', () => {
    const MockResizeableDraggablePaper = React.forwardRef((props, ref) => {
        const { setRefineSizeProps, width, height, children, ...otherProps } = props;
        React.useEffect(() => {
            if (setRefineSizeProps && typeof setRefineSizeProps === 'function') {
                setRefineSizeProps(() => ({ width, height }));
            }
        }, [setRefineSizeProps, width, height]);
        const { dragHandleId, dialogId, maxConstraints, minConstraints, ...domProps } = otherProps;
        return (<div ref={ref} data-testid={props['data-testid'] || 'resizeable-draggable-paper'} {...domProps}>
          {children}
        </div>);
    });
    MockResizeableDraggablePaper.displayName = 'MockResizeableDraggablePaper';
    return MockResizeableDraggablePaper;
});
describe('ResizableDraggableDialog', () => {
    const defaultProps = {
        isOpenState: true,
        onResize: jest.fn(),
        onClose: jest.fn(),
        title: 'Test Dialog',
        children: <div>Dialog Content</div>,
    };
    const renderDialog = (props = {}) => {
        return render(<ResizableDraggableDialog {...defaultProps} {...props}/>);
    };
    beforeEach(() => {
    });
    afterEach(() => {
        document.querySelectorAll('[aria-live]').forEach((el) => el.remove());
    });
    describe('Basic Rendering', () => {
        it('renders dialog when open', () => {
            renderDialog();
            expect(screen.getByText('Test Dialog')).toBeInTheDocument();
            expect(screen.getByText('Dialog Content')).toBeInTheDocument();
            expect(screen.getByTestId('resizeable-draggable-paper')).toBeInTheDocument();
        });
        it('does not render dialog when closed', () => {
            renderDialog({ isOpenState: false });
            expect(screen.queryByText('Test Dialog')).not.toBeInTheDocument();
            expect(screen.queryByText('Dialog Content')).not.toBeInTheDocument();
        });
        it('renders drag handle with accessibility attributes', () => {
            renderDialog();
            const handle = screen.getByLabelText(/Drag to move dialog/);
            expect(handle).toHaveAttribute('tabIndex', '0');
            expect(handle).toHaveAttribute('aria-label');
            const ariaLabel = handle.getAttribute('aria-label');
            expect(ariaLabel).toContain('Drag to move dialog');
            expect(ariaLabel).toContain('arrow keys');
            expect(ariaLabel).toContain('Shift');
        });
    });
    describe('Props Integration', () => {
        it('renders dialog actions when provided', () => {
            const mockDialogActions = () => (<div data-testid="dialog-actions">Actions</div>);
            renderDialog({ dialogActions: mockDialogActions });
            expect(screen.getByTestId('dialog-actions')).toBeInTheDocument();
        });
    });
    describe('Material-UI Integration', () => {
        it('integrates with Material-UI Dialog component', () => {
            renderDialog();
            const dialogRoot = document.querySelector('.MuiDialog-root');
            expect(dialogRoot).toBeInTheDocument();
        });
        it('handles component lifecycle without errors', () => {
            const { unmount, rerender } = renderDialog();
            expect(() => {
                rerender(<ResizableDraggableDialog {...defaultProps} title="Updated Title"/>);
            }).not.toThrow();
            expect(() => {
                unmount();
            }).not.toThrow();
        });
        it('handles prop updates correctly', () => {
            const { rerender } = renderDialog();
            expect(screen.getByText('Test Dialog')).toBeInTheDocument();
            rerender(<ResizableDraggableDialog {...defaultProps} title="Updated Dialog"/>);
            expect(screen.getByText('Updated Dialog')).toBeInTheDocument();
            expect(screen.queryByText('Test Dialog')).not.toBeInTheDocument();
        });
    });
    describe('Error Handling', () => {
        it('handles invalid props gracefully', () => {
            expect(() => {
                renderDialog({
                    initialWidth: -100,
                    initialHeight: -100,
                });
            }).not.toThrow();
        });
        it('handles undefined children gracefully', () => {
            expect(() => {
                renderDialog({
                    children: undefined,
                });
            }).not.toThrow();
        });
    });
    describe('Component Types and Interfaces', () => {
        it('accepts all expected props without TypeScript errors', () => {
            const allProps = {
                isOpenState: true,
                onResize: jest.fn(),
                title: 'Test',
                children: <div>Content</div>,
                initialHeight: 400,
                initialWidth: 600,
                minConstraints: [200, 150],
                maxConstraints: [1000, 800],
                modal: true,
                onClose: jest.fn(),
                paperProps: { elevation: 4 },
                dialogActions: () => {
                    const Actions = () => <div>Actions</div>;
                    return <Actions />;
                },
            };
            expect(() => {
                renderDialog(allProps);
            }).not.toThrow();
        });
    });
});
//# sourceMappingURL=dialog.test.jsx.map