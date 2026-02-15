'use client';

import { useEffect, useState } from 'react';
import { useNotifications } from '@toolpad/core';
import { useSession } from '../session-provider';

const NOTIFICATION_KEY_SESSION_LOADING = 'session-loading';
const NOTIFICATION_KEY_KEY_VALIDATION = 'key-validation-status';

export const KeyRefreshNotify = () => {
  const notifications = useNotifications();
  const { status: sessionStatus, keyValidation } = useSession();
  
  // Track notification state to prevent duplicate notifications
  const [lastNotifiedSessionStatus, setLastNotifiedSessionStatus] = useState<string>('');
  const [lastNotifiedKeyStatus, setLastNotifiedKeyStatus] = useState<string>('');
  const [hasShownInitialLoadingToast, setHasShownInitialLoadingToast] = useState(false);

  // Handle session loading notification (only on initial mount)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (sessionStatus === 'loading' && !hasShownInitialLoadingToast) {
      notifications.show('Loading session details...', {
        severity: 'info',
        key: NOTIFICATION_KEY_SESSION_LOADING,
        // No auto-timeout - will be closed when session loads
      });
      setHasShownInitialLoadingToast(true);
      setLastNotifiedSessionStatus(sessionStatus);
    } else if (sessionStatus !== 'loading' && lastNotifiedSessionStatus === 'loading') {
      // Close loading notification when session is no longer loading
      notifications.close(NOTIFICATION_KEY_SESSION_LOADING);
      setLastNotifiedSessionStatus(sessionStatus);
    }
  }, [sessionStatus, notifications, hasShownInitialLoadingToast, lastNotifiedSessionStatus]);

  // Handle key validation notifications
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const { status: keyStatus, error, lastValidated } = keyValidation;
    const currentStatusKey = `${keyStatus}-${error || ''}-${lastValidated?.getTime() || 0}`;

    // Skip if we've already notified for this exact state
    if (currentStatusKey === lastNotifiedKeyStatus) {
      return;
    }

    switch (keyStatus) {
      case 'unknown':
        // Close any existing notifications but don't show new ones
        notifications.close(NOTIFICATION_KEY_KEY_VALIDATION);
        break;

      case 'invalid':
        // Keys are out of date, show info notification with no timeout
        notifications.show('Authentication keys are out of date and being refreshed...', {
          severity: 'info',
          key: NOTIFICATION_KEY_KEY_VALIDATION,
          // No autoHideDuration - will be replaced by success/error
        });
        break;

      case 'validating':
      case 'synchronizing':
        // Keys are being processed, show info notification with no timeout
        notifications.show('Refreshing authentication keys...', {
          severity: 'info',
          key: NOTIFICATION_KEY_KEY_VALIDATION,
          // No autoHideDuration - will be replaced by success/error
        });
        break;

      case 'failed':
        // Show error notification with custom timeout
        const errorMessage = error || 'Key validation failed. Please try again later.';
        notifications.show(errorMessage, {
          severity: 'error',
          key: NOTIFICATION_KEY_KEY_VALIDATION,
          autoHideDuration: 60000, // 60 seconds
        });
        break;

      case 'valid':
        // Keys are valid, close any existing notifications (no success message needed)
        notifications.close(NOTIFICATION_KEY_KEY_VALIDATION);
        break;

      case 'synchronized':
        // Keys were successfully synchronized, show success message
        notifications.show('Authentication keys have been successfully refreshed.', {
          severity: 'success',
          key: NOTIFICATION_KEY_KEY_VALIDATION,
          autoHideDuration: 7500, // 7.5 seconds
        });
        break;

      default:
        // Unknown status, close notifications
        notifications.close(NOTIFICATION_KEY_KEY_VALIDATION);
        break;
    }

    setLastNotifiedKeyStatus(currentStatusKey);
  }, [keyValidation, notifications, lastNotifiedKeyStatus]);

  return null;
};