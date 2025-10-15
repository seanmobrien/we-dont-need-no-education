'use client';

import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useEffect,
  useState,
  useRef,
} from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type {
  SessionContextType,
  SessionResponse,
  KeyValidationStatus,
} from './types';
import {
  isKeyValidationDue,
  performKeyValidationWorkflow,
  updateKeyValidationTimestamp,
} from '@/lib/site-util/auth/key-validation';
import {
  getUserPublicKey,
  generateUserKeyPair,
  getUserPublicKeyForServer,
} from '@/lib/site-util/auth/user-keys';
import { fetch } from '@/lib/nextjs-util/fetch';
import { Session } from '@auth/core/types';
import { useNotifications } from '@toolpad/core';
import { LoggedError } from '@/lib/react-util';

export const SessionContext = createContext<SessionContextType<object> | null>(
  null,
);
const SESSION_QUERY_KEY = ['auth-session'] as const;
const SESSION_WITH_KEYS_QUERY_KEY = [
  ...SESSION_QUERY_KEY,
  'with-keys',
] as const;
type SessionQueryKey =
  | typeof SESSION_QUERY_KEY
  | typeof SESSION_WITH_KEYS_QUERY_KEY;

const mutationFn = async ({ publicKey }: { publicKey: string }) => {
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

const queryFn = async ({ queryKey }: { queryKey: SessionQueryKey }) => {
  const url =
    queryKey.length > 1 && queryKey[1] === 'with-keys'
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
  return (await res.json()) as SessionResponse<Session>;
};

const NOTIFICATION_KEY_USERHASH_COMPUTE = 'userhash-compute';
const errorMessage = 'Error computing user hash';

export const SessionProvider: React.FC<PropsWithChildren<object>> = ({
  children,
}) => {
  // Key validation state
  const [keyValidationStatus, setKeyValidationStatus] =
    useState<KeyValidationStatus>('unknown');
  const [lastValidated, setLastValidated] = useState<Date>();
  const [validationError, setValidationError] = useState<string>();
  const notifications = useNotifications();

  // Prevent unnecessary re-renders by tracking previous values
  const previousSessionStatus = useRef<
    'loading' | 'processing' | 'authenticated' | 'unauthenticated'
  >('loading');
  const previousKeyValidationStatus = useRef<KeyValidationStatus>('unknown');
  const [userHash, setUserHash] = useState<string | undefined | null>();

  // Session query - fetch with keys when validation is due
  const shouldGetKeys = isKeyValidationDue();

  const { data, isLoading, isFetching, refetch } = useQuery<
    SessionResponse<Session>,
    Error,
    SessionResponse<Session>,
    SessionQueryKey
  >({
    queryKey: shouldGetKeys ? SESSION_WITH_KEYS_QUERY_KEY : SESSION_QUERY_KEY,
    queryFn,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // SWR-style refresh every 5 min
    refetchOnWindowFocus: true,
    refetchOnMount: false,
  });

  const { mutateAsync } = useMutation({
    mutationKey: ['upload-public-key'],
    scope: {
      id: 'upload-public-key',
    },
    mutationFn: mutationFn,
    onError: (error) => {
      setKeyValidationStatus('failed');
      setValidationError(
        error instanceof Error ? error.message : 'Failed to upload public key',
      );
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
    // compute user hash
    // no-op on server or if crypto not available
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
      // if we have not been unmounted and we have a userHash, clear it out
      if (!cancelled && userHash) {
        setUserHash(undefined);
      }
      return unmountedEffect;
    }
    const computeHash = async () => {
      const enc = new TextEncoder();
      const data = enc.encode(input);
      const digest = await window.crypto.subtle.digest('SHA-256', data);
      // convert to hex string
      const hashArray = Array.from(new Uint8Array(digest));
      const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      // attach to response for downstream usage
      return hashHex;
    };
    // Compute the hash and then update state
    computeHash()
      .then((hash) => {
        // if we have not been unmounted and this is a new hash value, set it
        if (!cancelled && hash !== userHash) {
          setUserHash(hash);
        }
      })
      .catch((err) => {
        LoggedError.isTurtlesAllTheWayDownBaby(err, {
          source: 'UserHashCompute',
          log: true,
        });
        if (cancelled) return;
        // show notification of failure
        notifications.show(errorMessage, {
          severity: 'error',
          key: NOTIFICATION_KEY_USERHASH_COMPUTE,
          autoHideDuration: 60000, // 60 seconds
        });
      });

    return unmountedEffect;
  }, [data?.data?.user?.email, userHash, notifications]);

  // Key validation logic
  const performKeyValidation = useCallback(
    async (publicKeys: string[]) => {
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
          } else {
            setKeyValidationStatus('valid');
          }
          setLastValidated(new Date());
          updateKeyValidationTimestamp();
        } else {
          setKeyValidationStatus('failed');
          setValidationError(result.error);
        }
      } catch (error) {
        setKeyValidationStatus('failed');
        setValidationError(
          error instanceof Error ? error.message : 'Key validation failed',
        );
      }
    },
    [mutateAsync],
  );

  // Trigger key validation when public keys are available and validation is due
  const dataStatus = data?.status ?? 'unauthenticated';
  const dataKeys = (data?.publicKeys ?? []).join(',');

  useEffect(() => {
    if (
      dataStatus === 'authenticated' &&
      data?.publicKeys &&
      isKeyValidationDue() &&
      keyValidationStatus === 'unknown'
    ) {
      performKeyValidation(data.publicKeys);
    }
  }, [
    dataStatus,
    dataKeys,
    performKeyValidation,
    keyValidationStatus,
    data?.publicKeys,
  ]);

  // Reset key validation status when user logs out
  useEffect(() => {
    if (dataStatus === 'unauthenticated') {
      setKeyValidationStatus('unknown');
      setLastValidated(undefined);
      setValidationError(undefined);
    }
  }, [dataStatus]);

  // Determine current session status
  const currentStatus: 'loading' | 'authenticated' | 'unauthenticated' =
    isLoading
      ? 'loading'
      : dataStatus === 'authenticated'
        ? keyValidationStatus === 'validating' ||
          keyValidationStatus === 'synchronizing' ||
          userHash === undefined
          ? 'loading'
          : 'authenticated'
        : (dataStatus ?? 'unauthenticated');

  // Create context value, only updating if values actually changed
  const contextValue: SessionContextType<object> = {
    status: currentStatus,
    data: data?.data ?? null,
    isFetching,
    userHash: userHash ?? undefined,
    refetch,
    publicKeys: data?.publicKeys,
    keyValidation: {
      status: keyValidationStatus,
      lastValidated,
      error: validationError,
    },
  };

  // Track previous values for optimization
  previousSessionStatus.current = currentStatus;
  previousKeyValidationStatus.current = keyValidationStatus;

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
};
