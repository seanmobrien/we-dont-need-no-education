'use client';
import { NotificationsProvider } from '@toolpad/core';
import { KeyRefreshNotify } from './key-refresh-notify';
export const KeyRefreshNotifyWrapper = ({ children, }) => {
    return (<NotificationsProvider>
      <KeyRefreshNotify />
      {children}
    </NotificationsProvider>);
};
//# sourceMappingURL=wrapper.jsx.map