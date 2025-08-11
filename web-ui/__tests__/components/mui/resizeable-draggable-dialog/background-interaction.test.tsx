/**
 * @fileoverview Tests for background interaction when dialog is in non-modal floating mode
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@/__tests__/test-utils';
import ResizableDraggableDialog from '@/components/mui/resizeable-draggable-dialog';

describe('ResizableDraggableDialog Background Interaction', () => {
  it('should allow background clicks when modal=false', () => {
    const mockOnClose = jest.fn();
    const mockBackgroundClick = jest.fn();
    
    render(
      <div>
        <div 
          data-testid="background-element"
          onClick={mockBackgroundClick}
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%',
            zIndex: 1 
          }}
        >
          Background Content
        </div>
        <ResizableDraggableDialog
          isOpenState={true}
          title="Test Dialog"
          modal={false}
          onClose={mockOnClose}
          width={400}
          height={300}
        >
          <div>Dialog Content</div>
        </ResizableDraggableDialog>
      </div>
    );

    // Verify dialog is rendered
    expect(screen.getByText('Test Dialog')).toBeInTheDocument();
    expect(screen.getByText('Dialog Content')).toBeInTheDocument();
    
    // Click on background element
    const backgroundElement = screen.getByTestId('background-element');
    act(() => fireEvent.click(backgroundElement));

    // Background click should be received
    expect(mockBackgroundClick).toHaveBeenCalledTimes(1);
    
    // Dialog should not be closed by background click in non-modal mode
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should render correctly when modal=false', () => {
    const mockOnClose = jest.fn();
    
    render(
      <ResizableDraggableDialog
        isOpenState={true}
        title="Test Dialog"
        modal={false}
        onClose={mockOnClose}
        width={400}
        height={300}
      >
        <div>Dialog Content</div>
      </ResizableDraggableDialog>
    );

    // Verify dialog is rendered correctly
    expect(screen.getByText('Test Dialog')).toBeInTheDocument();
    expect(screen.getByText('Dialog Content')).toBeInTheDocument();
  });

  it('should still allow dialog content interaction when modal=false', () => {
    const mockOnClose = jest.fn();
    const mockDialogButtonClick = jest.fn();
    
    render(
      <ResizableDraggableDialog
        isOpenState={true}
        title="Test Dialog"
        modal={false}
        onClose={mockOnClose}
        width={400}
        height={300}
      >
        <button onClick={mockDialogButtonClick} data-testid="dialog-button">
          Dialog Button
        </button>
      </ResizableDraggableDialog>
    );

    // Click on dialog button
    const dialogButton = screen.getByTestId('dialog-button');
    act(() => {
      fireEvent.click(dialogButton);
    });
    
    // Dialog button click should work
    expect(mockDialogButtonClick).toHaveBeenCalledTimes(1);
  });
});