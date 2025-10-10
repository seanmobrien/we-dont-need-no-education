import React from 'react';
import { render } from '@/__tests__/test-utils';
import {
  ChatPanelProvider,
  useChatPanelContext,
} from '@/components/ai/chat-panel/chat-panel-context';

// Test component to access context
const TestComponent = () => {
  const context = useChatPanelContext();
  return (
    <div data-testid="test-component">
      <span data-testid="is-docked">{context.isDocked.toString()}</span>
      <span data-testid="is-floating">{context.isFloating.toString()}</span>
      <span data-testid="is-inline">{context.isInline.toString()}</span>
      <span data-testid="position">{context.config.position}</span>
    </div>
  );
};

describe('ChatPanelContext', () => {
  it('renders with default state snapshot', () => {
    const { container } = render(
      <ChatPanelProvider>
        <TestComponent />
      </ChatPanelProvider>,
    );
    expect(container).toMatchSnapshot();
  }, 10000);

  it('provides default context values', () => {
    const { getByTestId } = render(
      <ChatPanelProvider>
        <TestComponent />
      </ChatPanelProvider>,
    );

    expect(getByTestId('is-docked')).toHaveTextContent('false');
    expect(getByTestId('is-floating')).toHaveTextContent('false');
    expect(getByTestId('is-inline')).toHaveTextContent('true');
    expect(getByTestId('position')).toHaveTextContent('inline');
  }, 10000);
});
