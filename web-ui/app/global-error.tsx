'use client'; // Error boundaries must be Client Components

import * as React from 'react';
import { useEffect, useMemo, useState, useContext } from 'react';
import { errorReporter, ErrorSeverity } from '/lib/error-monitoring';
import { RenderErrorBoundaryFallback } from '/components/error-boundaries/renderFallback';
import {
  type KnownFeatureType,
  type FeatureFlagStatus,
} from '/lib/site-util/feature-flags/known-feature';
import {
  defaultFlags,
  FeatureFlagsApi,
  FeatureFlagsContext,
} from '/lib/site-util/feature-flags/context';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export function useFeatureFlagsContext(): FeatureFlagsApi {
  const ctx = useContext(FeatureFlagsContext);
  if (!ctx) {
    // Provide a safe fallback that uses the default flags
    return {
      getFlag: (key, defaultValue) =>
        (defaultFlags[key] ?? defaultValue) as FeatureFlagStatus,
      getFlags: (keys, defaults) =>
        keys.map(
          (k, i) => defaultFlags[k] ?? defaults?.[i] ?? defaultFlags[k],
        ) as FeatureFlagStatus[],
      getAllFlags: () => ({ ...defaultFlags }),
      isEnabled: (key) =>
        Boolean(defaultFlags[key as KnownFeatureType] ?? false),
      getFlagState: (key) => ({
        value: defaultFlags[key as KnownFeatureType],
        isLoading: false,
        error: null,
      }),
    };
  }
  return ctx;
}

/**
 * Provider which reads an optional server-injected global (`window.__FEATURE_FLAGS__`)
 * and exposes a small, synchronous flags API to the client. This is intentionally
 * lightweight and does not initialize any Flagsmith client libs.
 */
export const FeatureFlagsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  // Attempt to hydrate from a server-provided global (set during SSR)
  const initial = useMemo<
    Partial<Record<KnownFeatureType, FeatureFlagStatus>>
  >(() => {
    try {
      const win =
        typeof window !== 'undefined'
          ? (window as Window & { __FEATURE_FLAGS__?: unknown })
          : undefined;
      // If the server injected flags are present, assume they match KnownFeatureType keys
      if (
        win &&
        win.__FEATURE_FLAGS__ &&
        typeof win.__FEATURE_FLAGS__ === 'object'
      ) {
        return win.__FEATURE_FLAGS__ as Partial<
          Record<KnownFeatureType, FeatureFlagStatus>
        >;
      }
      return defaultFlags;
    } catch {
      return defaultFlags;
    }
  }, []);

  const [flags] =
    useState<Partial<Record<KnownFeatureType, FeatureFlagStatus>>>(initial);

  const api = useMemo<FeatureFlagsApi>(
    () => ({
      getFlag: (key, defaultValue) =>
        (flags[key as KnownFeatureType] ??
          defaultValue ??
          defaultFlags[key as KnownFeatureType]) as FeatureFlagStatus,
      getFlags: (keys, defaults) =>
        keys.map(
          (k, i) =>
            (flags[k] ?? defaults?.[i] ?? defaultFlags[k]) as FeatureFlagStatus,
        ),
      getAllFlags: () => ({ ...defaultFlags, ...flags }),
      isEnabled: (key) =>
        Boolean(
          flags[key as KnownFeatureType] ??
            defaultFlags[key as KnownFeatureType] ??
            false,
        ),
      getFlagState: (key) => ({
        value:
          flags[key as KnownFeatureType] ??
          defaultFlags[key as KnownFeatureType],
        isLoading: false,
        error: null,
      }),
    }),
    [flags],
  );

  return (
    <FeatureFlagsContext.Provider value={api}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};

/**
 * Global error boundary that catches errors in the root layout
 * This is a last resort fallback for critical application errors
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Report the critical error - this is the last line of defense
    errorReporter.reportBoundaryError(
      error,
      {
        errorBoundary: 'GlobalError',
      },
      ErrorSeverity.CRITICAL,
    );
  }, [error]);

  return (
    <html lang="en">
      <head>
        <title>Application Error - School Case Tracker</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        {/* Provide feature flags context so the error UI and any children can call */}
        <FeatureFlagsProvider>
          <div
            style={{
              minHeight: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#fafafa',
            }}
          >
            <RenderErrorBoundaryFallback
              error={error}
              resetErrorBoundary={reset}
            />
          </div>
        </FeatureFlagsProvider>
      </body>
    </html>
  );
}
