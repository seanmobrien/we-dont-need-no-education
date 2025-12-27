import { checkDatabaseHealth } from '@/lib/api/health/database';
import {
  getMemoryHealthCache,
  determineHealthStatus,
} from '@/lib/api/health/memory';
import { getFeatureFlag } from '@/lib/site-util/feature-flags/server';
import { wrapRouteRequest } from '@/lib/nextjs-util/server/utils';
import { SingletonProvider } from '@compliance-theater/typescript/singleton-provider/provider';
import { NextRequest, NextResponse } from 'next/server';
import type { Span } from '@opentelemetry/api';
import { wellKnownFlag } from '@/lib/site-util/feature-flags/feature-flag-with-refresh';
import { KnownFeatureType } from '@/lib/site-util/feature-flags/known-feature';

const DEFAULT_STARTUP_FAILURE_THRESHOLD = 10;
const STARTUP_FAILURE_COUNTER_KEY = 'startup-failure-counter';

const resolveThreshold = async (): Promise<number> => {
  const envRaw =
    process.env.HEALTH_STARTUP_FAILURE_THRESHOLD ??
    process.env.NEXT_PUBLIC_HEALTH_STARTUP_FAILURE_THRESHOLD;
  const envValue = Number.parseInt(String(envRaw ?? ''), 10);
  if (Number.isFinite(envValue) && envValue >= 0) {
    return envValue;
  }

  try {
    const flagValue = (await getFeatureFlag(
      'health_startup_failure_threshold'
    )) as unknown as number;
    if (typeof flagValue === 'number' && flagValue >= 0) {
      return flagValue;
    }
  } catch {
    // ignore and use default
  }

  return DEFAULT_STARTUP_FAILURE_THRESHOLD;
};

type StartupFailureCounter = { count: number };

const getStartupCounter = (): StartupFailureCounter =>
  SingletonProvider.Instance.getRequired<StartupFailureCounter>(
    STARTUP_FAILURE_COUNTER_KEY,
    () => ({ count: 0 })
  );

const incrementCounter = (): number => {
  const counter = getStartupCounter();
  counter.count = (counter.count ?? 0) + 1;
  SingletonProvider.Instance.set(STARTUP_FAILURE_COUNTER_KEY, counter);
  return counter.count;
};

const resetCounter = (): void => {
  SingletonProvider.Instance.delete(STARTUP_FAILURE_COUNTER_KEY);
};

// These flags are critical for app functionality, ensure they are in memory during
// readiness checks to avoid delays later.
const CriticalFeatureFlags: Array<KnownFeatureType> = [
  'models_config_azure',
  'models_config_openai',
  'models_config_google',
];

type ProbeParams = { probe_type: string };

export const GET = wrapRouteRequest(
  async (
    _req: NextRequest,
    { params, span }: { params: Promise<ProbeParams>; span?: Span }
  ): Promise<NextResponse> => {
    if (!span) {
      throw new TypeError('No span provided to health probe route.');
    }
    const resolvedParams = await params;
    const probeType = (resolvedParams?.probe_type ?? 'liveness').toLowerCase();

    switch (probeType) {
      case 'liveness': {
        span.setAttribute('health.probe', 'liveness');
        return NextResponse.json({ status: 'ok' }, { status: 200 });
      }

      case 'readiness': {
        span.setAttribute('health.probe', 'readiness');
        const dbHealth = await checkDatabaseHealth();
        // Load critical feature flags for use in subsequent requests
        CriticalFeatureFlags.forEach((flagName) => {
          wellKnownFlag(flagName);
        });
        const status = dbHealth?.status === 'healthy' ? 200 : 503;
        return NextResponse.json(
          { status: dbHealth?.status ?? 'error' },
          { status }
        );
      }

      case 'startup': {
        span.setAttribute('health.probe', 'startup');

        const dbHealth = await checkDatabaseHealth();
        if (dbHealth?.status !== 'healthy') {
          incrementCounter();
          return NextResponse.json({ status: 'error' }, { status: 503 });
        }

        const memCache = await getMemoryHealthCache();
        const memResponse = memCache?.get();
        const memStatus =
          memResponse && memResponse.details
            ? determineHealthStatus(memResponse.details)
            : 'error';

        const threshold = await resolveThreshold();
        const currentCounter = getStartupCounter().count ?? 0;

        if (currentCounter > threshold) {
          return NextResponse.json({ status: 'ok' }, { status: 200 });
        }

        if (memStatus !== 'healthy') {
          const updated = incrementCounter();
          span.setAttribute('health.startup.failures', updated);
          return NextResponse.json({ status: 'error' }, { status: 503 });
        }

        resetCounter();
        return NextResponse.json({ status: 'ok' }, { status: 200 });
      }

      default: {
        span.setAttribute('health.probe', 'unknown');
        return NextResponse.json({ status: 'unknown-probe' }, { status: 400 });
      }
    }
  }
);
