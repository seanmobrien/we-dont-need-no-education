'use client';
import React, { createContext, useCallback, useEffect, useState, useRef, } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { isKeyValidationDue, performKeyValidationWorkflow, updateKeyValidationTimestamp, } from '@/lib/site-util/auth/key-validation';
import { getUserPublicKey, generateUserKeyPair, getUserPublicKeyForServer, } from '@/lib/site-util/auth/user-keys';
import { fetch } from '@/lib/nextjs-util/fetch';
import { useNotifications } from '@toolpad/core';
import { LoggedError } from '@compliance-theater/logger';
import { InvalidGrantError } from '@/lib/auth/errors';
export const SessionContext = createContext(null);
const SESSION_QUERY_KEY = ['auth-session'];
const SESSION_WITH_KEYS_QUERY_KEY = [
    ...SESSION_QUERY_KEY,
    'with-keys',
];
const mutationFn = async ({ publicKey }) => {
    const res = await fetch('/api/auth/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey }),
    });
    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Key upload failed: ${res.status} ${errorText}`);
    }
    const result = await res.json();
    if (!result.success) {
        throw new Error(result.error || 'Key upload was not successful');
    }
    return result;
};
const queryFn = async ({ queryKey }) => {
    const url = queryKey.length > 1 && queryKey[1] === 'with-keys'
        ? '/api/auth/session?get-keys=true'
        : '/api/auth/session';
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error('Failed to fetch session', {
            cause: {
                name: 'FetchError',
                status: res.status,
                statusText: res.statusText,
            },
        });
    }
    return (await res.json());
};
const NOTIFICATION_KEY_USERHASH_COMPUTE = 'userhash-compute';
const errorMessage = 'Error computing user hash';
export const SessionProvider = ({ children, }) => {
    const [keyValidationStatus, setKeyValidationStatus] = useState('unknown');
    const [lastValidated, setLastValidated] = useState();
    const [validationError, setValidationError] = useState();
    const notifications = useNotifications();
    const previousSessionStatus = useRef('loading');
    const previousKeyValidationStatus = useRef('unknown');
    const [userHash, setUserHash] = useState();
    const shouldGetKeys = isKeyValidationDue();
    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: shouldGetKeys ? SESSION_WITH_KEYS_QUERY_KEY : SESSION_QUERY_KEY,
        queryFn,
        staleTime: 5 * 60 * 1000,
        refetchInterval: 5 * 60 * 1000,
        refetchOnWindowFocus: true,
        refetchOnMount: false,
    });
    if (data?.data?.error === 'RefreshAccessTokenError') {
        throw new InvalidGrantError('Session refresh failed');
    }
    const { mutateAsync } = useMutation({
        mutationKey: ['upload-public-key'],
        scope: {
            id: 'upload-public-key',
        },
        mutationFn: mutationFn,
        onError: (error) => {
            setKeyValidationStatus('failed');
            setValidationError(error instanceof Error ? error.message : 'Failed to upload public key');
        },
        onSuccess: () => {
            setKeyValidationStatus('synchronized');
            setLastValidated(new Date());
            updateKeyValidationTimestamp();
        },
    });
    useEffect(() => {
        let cancelled = false;
        const unmountedEffect = () => {
            cancelled = true;
        };
        if (typeof window === 'undefined') {
            return unmountedEffect;
        }
        if (!window.crypto || !window.crypto.subtle) {
            if (userHash !== null) {
                setUserHash(null);
            }
            return unmountedEffect;
        }
        const input = data?.data?.user?.email;
        if (!input) {
            if (!cancelled && userHash) {
                setUserHash(undefined);
            }
            return unmountedEffect;
        }
        const computeHash = async () => {
            const enc = new TextEncoder();
            const data = enc.encode(input);
            const digest = await window.crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(digest));
            const hashHex = hashArray
                .map((b) => b.toString(16).padStart(2, '0'))
                .join('');
            return hashHex;
        };
        computeHash()
            .then((hash) => {
            if (!cancelled && hash !== userHash) {
                setUserHash(hash);
            }
        })
            .catch((err) => {
            LoggedError.isTurtlesAllTheWayDownBaby(err, {
                source: 'UserHashCompute',
                log: true,
            });
            if (cancelled)
                return;
            notifications.show(errorMessage, {
                severity: 'error',
                key: NOTIFICATION_KEY_USERHASH_COMPUTE,
                autoHideDuration: 60000,
            });
        });
        return unmountedEffect;
    }, [data?.data?.user?.email, userHash, notifications]);
    const performKeyValidation = useCallback(async (publicKeys) => {
        setKeyValidationStatus('validating');
        setValidationError(undefined);
        try {
            const result = await performKeyValidationWorkflow(publicKeys ?? [], {
                getPublicKey: getUserPublicKey,
                generateKeyPair: generateUserKeyPair,
                exportPublicKeyForServer: getUserPublicKeyForServer,
                uploadPublicKeyToServer: async ({ publicKey }) => {
                    await mutateAsync({ publicKey });
                },
            });
            if (result.validated) {
                if (result.synchronized) {
                    setKeyValidationStatus('synchronized');
                }
                else {
                    setKeyValidationStatus('valid');
                }
                setLastValidated(new Date());
                updateKeyValidationTimestamp();
            }
            else {
                setKeyValidationStatus('failed');
                setValidationError(result.error);
            }
        }
        catch (error) {
            setKeyValidationStatus('failed');
            setValidationError(error instanceof Error ? error.message : 'Key validation failed');
        }
    }, [mutateAsync]);
    const dataStatus = data?.status ?? 'unauthenticated';
    const dataKeys = (data?.publicKeys ?? []).join(',');
    useEffect(() => {
        if (dataStatus === 'authenticated' &&
            data?.publicKeys &&
            isKeyValidationDue() &&
            keyValidationStatus === 'unknown') {
            performKeyValidation(data.publicKeys);
        }
    }, [
        dataStatus,
        dataKeys,
        performKeyValidation,
        keyValidationStatus,
        data?.publicKeys,
    ]);
    useEffect(() => {
        if (dataStatus === 'unauthenticated') {
            setKeyValidationStatus('unknown');
            setLastValidated(undefined);
            setValidationError(undefined);
        }
    }, [dataStatus]);
    const currentStatus = isLoading
        ? 'loading'
        : dataStatus === 'authenticated'
            ? keyValidationStatus === 'validating' ||
                keyValidationStatus === 'synchronizing' ||
                userHash === undefined
                ? 'loading'
                : 'authenticated'
            : (dataStatus ?? 'unauthenticated');
    const contextValue = {
        status: currentStatus,
        data: data?.data ?? null,
        isFetching,
        userHash: userHash === null ? undefined : userHash,
        refetch,
        publicKeys: data?.publicKeys,
        keyValidation: {
            status: keyValidationStatus,
            lastValidated,
            error: validationError,
        },
    };
    previousSessionStatus.current = currentStatus;
    previousKeyValidationStatus.current = keyValidationStatus;
    return (<SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>);
};
//# sourceMappingURL=provider.jsx.map