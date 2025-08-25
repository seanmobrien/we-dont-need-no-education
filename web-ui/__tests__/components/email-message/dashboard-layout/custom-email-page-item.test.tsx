/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen } from '@/__tests__/test-utils';
import { CustomEmailPageItem } from '@/components/email-message/dashboard-layout/custom-email-page-item';
import type { NavigationPageItem } from '@toolpad/core/AppProvider';

const makeItem = (
  overrides: Partial<NavigationPageItem> = {},
): NavigationPageItem => ({
  kind: 'page',
  title: 'Email',
  segment: 'email/{emailId}',
  children: [
    { kind: 'page', title: 'Details', segment: 'details' },
    { kind: 'page', title: undefined as any, segment: 'attachments' },
  ],
  ...overrides,
});

// Mock the siteBuilder utility to produce consistent hrefs
jest.mock('@/lib/site-util/url-builder', () => ({
  __esModule: true,
  default: {
    messages: {
      email: (emailId: string) => ({
        toString: () => `/messages/email/${emailId}`,
      }),
    },
  },
}));

// Mock Toolpad component for child rendering
jest.mock('@toolpad/core/DashboardLayout', () => ({
  DashboardSidebarPageItem: ({ item }: { item: NavigationPageItem }) => (
    <div data-testid={`sidebar-item-${item.segment || item.title}`}>
      {item.title}
    </div>
  ),
}));

describe('CustomEmailPageItem', () => {
  it('marks parent as current page when pathname matches', () => {
    render(
      <CustomEmailPageItem
        item={makeItem()}
        mini={false}
        emailId="123"
        pathname="/messages/email/123"
      />,
    );
    const link = screen.getByRole('link', { name: 'Email' });
    expect(link).toHaveAttribute('aria-current', 'page');
  });

  it('applies active style to child when last segment matches', () => {
    render(
      <CustomEmailPageItem
        item={makeItem()}
        mini={false}
        emailId="123"
        pathname="/messages/email/123/details"
      />,
    );
    const active = document.querySelector('[data-active="true"]');
    expect(active).toBeTruthy();
    expect(active?.textContent).toMatch(/details|Details/i);
  });

  it('renders tooltip and aria-label in mini mode', () => {
    render(
      <CustomEmailPageItem
        item={makeItem({ icon: (<span data-testid="icon">I</span>) as any })}
        mini={true}
        emailId="123"
        pathname="/messages/email/123"
      />,
    );
    const button = screen.getByRole('button', { name: /email/i });
    expect(button).toBeInTheDocument();
  });

  it('labels child list with item title', () => {
    render(
      <CustomEmailPageItem
        item={makeItem()}
        mini={false}
        emailId="123"
        pathname="/messages/email/123"
      />,
    );
    const list = screen.getByRole('list', { name: /email sections/i });
    expect(list).toBeInTheDocument();
  });
});
