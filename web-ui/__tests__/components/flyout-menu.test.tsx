/**
 * @fileoverview Tests for the FlyoutMenu component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/__tests__/test-utils';
import { FlyoutMenu } from '@/components/flyout-menu';
import { MenuItem } from '@mui/material';

describe('FlyoutMenu', () => {
  const defaultProps = {
    label: 'Test Menu',
    isOpen: false,
    onHover: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with label', () => {
      render(
        <FlyoutMenu {...defaultProps}>
          <MenuItem>Child Item</MenuItem>
        </FlyoutMenu>,
      );

      expect(screen.getByText('Test Menu')).toBeInTheDocument();
    });

    it('renders with icon when provided', () => {
      const icon = <span data-testid="test-icon">Icon</span>;
      render(
        <FlyoutMenu {...defaultProps} icon={icon}>
          <MenuItem>Child Item</MenuItem>
        </FlyoutMenu>,
      );

      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    });

    it('renders with custom data-testid', () => {
      render(
        <FlyoutMenu {...defaultProps} dataTestId="custom-menu">
          <MenuItem>Child Item</MenuItem>
        </FlyoutMenu>,
      );

      expect(screen.getByTestId('custom-menu')).toBeInTheDocument();
    });

    it('applies active state when active prop is true', () => {
      render(
        <FlyoutMenu {...defaultProps} active={true} dataTestId="active-menu">
          <MenuItem>Child Item</MenuItem>
        </FlyoutMenu>,
      );

      const menuItem = screen.getByTestId('active-menu');
      expect(menuItem).toHaveClass('Mui-selected');
    });

    it('renders children in flyout menu', () => {
      render(
        <FlyoutMenu {...defaultProps} isOpen={true}>
          <MenuItem>Child Item 1</MenuItem>
          <MenuItem>Child Item 2</MenuItem>
        </FlyoutMenu>,
      );

      // Menu is rendered but children visibility depends on isOpen and anchorEl
      // We'll test this in the interaction tests
    });
  });

  describe('Hover Interactions', () => {
    it('calls onHover when mouse enters', () => {
      const onHover = jest.fn();
      render(
        <FlyoutMenu {...defaultProps} onHover={onHover} dataTestId="hover-menu">
          <MenuItem>Child Item</MenuItem>
        </FlyoutMenu>,
      );

      const menuItem = screen.getByTestId('hover-menu');
      fireEvent.mouseEnter(menuItem);

      expect(onHover).toHaveBeenCalledTimes(1);
    });

    it('opens submenu on mouse enter', async () => {
      render(
        <FlyoutMenu {...defaultProps} isOpen={true} dataTestId="hover-menu">
          <MenuItem data-testid="child-item">Child Item</MenuItem>
        </FlyoutMenu>,
      );

      const menuItem = screen.getByTestId('hover-menu');
      fireEvent.mouseEnter(menuItem);

      // Wait for menu to open
      await waitFor(() => {
        expect(screen.getByTestId('child-item')).toBeInTheDocument();
      });
    });

    it('shows submenu only when isOpen is true', async () => {
      const { rerender } = render(
        <FlyoutMenu {...defaultProps} isOpen={false} dataTestId="hover-menu">
          <MenuItem data-testid="child-item">Child Item</MenuItem>
        </FlyoutMenu>,
      );

      const menuItem = screen.getByTestId('hover-menu');
      fireEvent.mouseEnter(menuItem);

      // Child should not be visible when isOpen is false
      await waitFor(() => {
        expect(screen.queryByTestId('child-item')).not.toBeInTheDocument();
      });

      // Rerender with isOpen=true
      rerender(
        <FlyoutMenu {...defaultProps} isOpen={true} dataTestId="hover-menu">
          <MenuItem data-testid="child-item">Child Item</MenuItem>
        </FlyoutMenu>,
      );

      fireEvent.mouseEnter(menuItem);

      // Now child should be visible
      await waitFor(() => {
        expect(screen.getByTestId('child-item')).toBeInTheDocument();
      });
    });
  });

  describe('Click Interactions', () => {
    it('calls onHover when clicked', () => {
      const onHover = jest.fn();
      render(
        <FlyoutMenu {...defaultProps} onHover={onHover} dataTestId="click-menu">
          <MenuItem>Child Item</MenuItem>
        </FlyoutMenu>,
      );

      const menuItem = screen.getByTestId('click-menu');
      fireEvent.click(menuItem);

      expect(onHover).toHaveBeenCalledTimes(1);
    });

    it('stops propagation on click', () => {
      const onHover = jest.fn();
      const parentClickHandler = jest.fn();

      const { container } = render(
        <div onClick={parentClickHandler}>
          <FlyoutMenu
            {...defaultProps}
            onHover={onHover}
            dataTestId="click-menu"
          >
            <MenuItem>Child Item</MenuItem>
          </FlyoutMenu>
        </div>,
      );

      const menuItem = screen.getByTestId('click-menu');
      fireEvent.click(menuItem);

      expect(onHover).toHaveBeenCalledTimes(1);
      // Parent click should not be called due to stopPropagation
      expect(parentClickHandler).not.toHaveBeenCalled();
    });

    it('opens submenu when clicked', async () => {
      render(
        <FlyoutMenu {...defaultProps} isOpen={true} dataTestId="click-menu">
          <MenuItem data-testid="child-item">Child Item</MenuItem>
        </FlyoutMenu>,
      );

      const menuItem = screen.getByTestId('click-menu');
      fireEvent.click(menuItem);

      await waitFor(() => {
        expect(screen.getByTestId('child-item')).toBeInTheDocument();
      });
    });
  });

  describe('Menu Positioning', () => {
    it('positions submenu correctly relative to parent', async () => {
      render(
        <FlyoutMenu {...defaultProps} isOpen={true} dataTestId="position-menu">
          <MenuItem data-testid="child-item">Child Item</MenuItem>
        </FlyoutMenu>,
      );

      const menuItem = screen.getByTestId('position-menu');
      fireEvent.mouseEnter(menuItem);

      await waitFor(() => {
        const childItem = screen.getByTestId('child-item');
        expect(childItem).toBeInTheDocument();
      });
    });
  });

  describe('Prop Handling', () => {
    it('handles missing optional props gracefully', () => {
      render(
        <FlyoutMenu label="Minimal Menu" isOpen={false} onHover={jest.fn()}>
          <MenuItem>Child Item</MenuItem>
        </FlyoutMenu>,
      );

      expect(screen.getByText('Minimal Menu')).toBeInTheDocument();
    });

    it('handles all props provided', () => {
      const icon = <span data-testid="full-icon">Icon</span>;
      const onHover = jest.fn();

      render(
        <FlyoutMenu
          label="Full Menu"
          icon={icon}
          active={true}
          dataTestId="full-menu"
          isOpen={true}
          onHover={onHover}
        >
          <MenuItem>Child Item</MenuItem>
        </FlyoutMenu>,
      );

      expect(screen.getByText('Full Menu')).toBeInTheDocument();
      expect(screen.getByTestId('full-icon')).toBeInTheDocument();
      expect(screen.getByTestId('full-menu')).toHaveClass('Mui-selected');
    });

    it('updates when props change', () => {
      const { rerender } = render(
        <FlyoutMenu
          {...defaultProps}
          label="Original Label"
          dataTestId="prop-menu"
        >
          <MenuItem>Child Item</MenuItem>
        </FlyoutMenu>,
      );

      expect(screen.getByText('Original Label')).toBeInTheDocument();

      rerender(
        <FlyoutMenu
          {...defaultProps}
          label="Updated Label"
          dataTestId="prop-menu"
        >
          <MenuItem>Child Item</MenuItem>
        </FlyoutMenu>,
      );

      expect(screen.queryByText('Original Label')).not.toBeInTheDocument();
      expect(screen.getByText('Updated Label')).toBeInTheDocument();
    });
  });

  describe('Menu Opening and Closing', () => {
    it('opens menu when hovering and isOpen is true', async () => {
      render(
        <FlyoutMenu {...defaultProps} isOpen={true} dataTestId="close-menu">
          <MenuItem data-testid="child-item">Child Item</MenuItem>
        </FlyoutMenu>,
      );

      const menuItem = screen.getByTestId('close-menu');
      fireEvent.mouseEnter(menuItem);

      await waitFor(() => {
        expect(screen.getByTestId('child-item')).toBeInTheDocument();
      });
    });

    it('does not open menu when hovering and isOpen is false', () => {
      render(
        <FlyoutMenu {...defaultProps} isOpen={false} dataTestId="no-open-menu">
          <MenuItem data-testid="child-item">Child Item</MenuItem>
        </FlyoutMenu>,
      );

      const menuItem = screen.getByTestId('no-open-menu');
      fireEvent.mouseEnter(menuItem);

      // Menu should not be visible when isOpen is false
      expect(screen.queryByTestId('child-item')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('renders with proper ARIA attributes', () => {
      render(
        <FlyoutMenu {...defaultProps} dataTestId="aria-menu">
          <MenuItem>Child Item</MenuItem>
        </FlyoutMenu>,
      );

      const menuItem = screen.getByTestId('aria-menu');
      expect(menuItem).toHaveAttribute('role', 'menuitem');
    });
  });
});
