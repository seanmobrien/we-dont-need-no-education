'use client';

import { NotificationsProvider } from "@toolpad/core";
import { KeyRefreshNotify } from './key-refresh-notify';

export const KeyRefreshNotifyWrapper = () => {
  return (
    <NotificationsProvider>
      <KeyRefreshNotify />
    </NotificationsProvider>
  );
};