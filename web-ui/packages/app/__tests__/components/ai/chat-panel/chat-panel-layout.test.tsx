import React from 'react';
import { render } from '@/__tests__/test-utils';
import { ChatPanelLayout } from '@/components/ai/chat-panel/chat-panel-layout';
import { ChatPanelProvider } from '@/components/ai/chat-panel/chat-panel-context';

describe('ChatPanelLayout', () => {
  it('renders with default props snapshot', () => {
    const { container } = render(
      <ChatPanelProvider>
        <ChatPanelLayout>
          <div>Test child content</div>
        </ChatPanelLayout>
      </ChatPanelProvider>,
    );
    expect(container).toMatchSnapshot();
  }, 10000);

  it('renders children correctly', () => {
    const { getByText } = render(
      <ChatPanelProvider>
        <ChatPanelLayout>
          <div>Test child content</div>
        </ChatPanelLayout>
      </ChatPanelProvider>,
    );

    expect(getByText('Test child content')).toBeInTheDocument();
  }, 10000);
});
