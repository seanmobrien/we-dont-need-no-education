'use client';

import { NotificationsProvider } from '@toolpad/core';
import { KeyRefreshNotify } from './key-refresh-notify';
import { PropsWithChildren } from 'react';

export const KeyRefreshNotifyWrapper = ({
  children,
}: PropsWithChildren<object>) => {
  return (
    <NotificationsProvider>
      <KeyRefreshNotify />
      {children}
    </NotificationsProvider>
  );
};
