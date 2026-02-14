'use client';
import { useEffect, useState } from 'react';
import { useNotifications } from '@toolpad/core';
import { useSession } from '../session-provider';
const NOTIFICATION_KEY_SESSION_LOADING = 'session-loading';
const NOTIFICATION_KEY_KEY_VALIDATION = 'key-validation-status';
export const KeyRefreshNotify = () => {
    const notifications = useNotifications();
    const { status: sessionStatus, keyValidation } = useSession();
    const [lastNotifiedSessionStatus, setLastNotifiedSessionStatus] = useState('');
    const [lastNotifiedKeyStatus, setLastNotifiedKeyStatus] = useState('');
    const [hasShownInitialLoadingToast, setHasShownInitialLoadingToast] = useState(false);
    useEffect(() => {
        if (typeof window === 'undefined')
            return;
        if (sessionStatus === 'loading' && !hasShownInitialLoadingToast) {
            notifications.show('Loading session details...', {
                severity: 'info',
                key: NOTIFICATION_KEY_SESSION_LOADING,
            });
            setHasShownInitialLoadingToast(true);
            setLastNotifiedSessionStatus(sessionStatus);
        }
        else if (sessionStatus !== 'loading' && lastNotifiedSessionStatus === 'loading') {
            notifications.close(NOTIFICATION_KEY_SESSION_LOADING);
            setLastNotifiedSessionStatus(sessionStatus);
        }
    }, [sessionStatus, notifications, hasShownInitialLoadingToast, lastNotifiedSessionStatus]);
    useEffect(() => {
        if (typeof window === 'undefined')
            return;
        const { status: keyStatus, error, lastValidated } = keyValidation;
        const currentStatusKey = `${keyStatus}-${error || ''}-${lastValidated?.getTime() || 0}`;
        if (currentStatusKey === lastNotifiedKeyStatus) {
            return;
        }
        switch (keyStatus) {
            case 'unknown':
                notifications.close(NOTIFICATION_KEY_KEY_VALIDATION);
                break;
            case 'invalid':
                notifications.show('Authentication keys are out of date and being refreshed...', {
                    severity: 'info',
                    key: NOTIFICATION_KEY_KEY_VALIDATION,
                });
                break;
            case 'validating':
            case 'synchronizing':
                notifications.show('Refreshing authentication keys...', {
                    severity: 'info',
                    key: NOTIFICATION_KEY_KEY_VALIDATION,
                });
                break;
            case 'failed':
                const errorMessage = error || 'Key validation failed. Please try again later.';
                notifications.show(errorMessage, {
                    severity: 'error',
                    key: NOTIFICATION_KEY_KEY_VALIDATION,
                    autoHideDuration: 60000,
                });
                break;
            case 'valid':
                notifications.close(NOTIFICATION_KEY_KEY_VALIDATION);
                break;
            case 'synchronized':
                notifications.show('Authentication keys have been successfully refreshed.', {
                    severity: 'success',
                    key: NOTIFICATION_KEY_KEY_VALIDATION,
                    autoHideDuration: 7500,
                });
                break;
            default:
                notifications.close(NOTIFICATION_KEY_KEY_VALIDATION);
                break;
        }
        setLastNotifiedKeyStatus(currentStatusKey);
    }, [keyValidation, notifications, lastNotifiedKeyStatus]);
    return null;
};
//# sourceMappingURL=key-refresh-notify.jsx.map