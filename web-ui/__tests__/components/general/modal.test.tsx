import React from 'react';
import { render } from '/__tests__/test-utils';
import Modal from '/components/general/modal';

// Mock portal rendering
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (children: React.ReactNode) => children,
}));

describe('Modal', () => {
  const defaultProps = {
    isOpen: false,
    title: 'Test Modal Title',
    onClose: jest.fn(),
  };

  it('renders closed modal snapshot', () => {
    const { container } = render(
      <Modal {...defaultProps}>
        <div>Modal content</div>
      </Modal>,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders open modal snapshot', () => {
    const { container } = render(
      <Modal {...defaultProps} isOpen={true}>
        <div>Modal content</div>
      </Modal>,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders modal with title snapshot', () => {
    const { container } = render(
      <Modal {...defaultProps} isOpen={true} title="Test Modal Title">
        <div>Modal content</div>
      </Modal>,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders modal with actions snapshot', () => {
    const actions = (
      <div>
        <button>Cancel</button>
        <button>Save</button>
      </div>
    );

    const { container } = render(
      <Modal {...defaultProps}>
        <div>Modal content</div>
      </Modal>,
    );
    expect(container).toMatchSnapshot();
  });
});
