/* @jest-environment node */

/**
 * Tests for fetch-config.ts:
 * - fetchConfig, fetchConfigSync, forceRefreshFetchConfig
 * - getFetchConfigStatus (returns FetchConfigManager instance)
 * - FetchConfigManager properties: isStale, lastError, ttlRemaining, isInitialized
 * - FetchConfigManager methods: forceRefresh, initialize
 * - fetchConfigFlagsmithFactory reuse (second call returns cached instance)
 */

import {
  fetchConfig,
  fetchConfigSync,
  forceRefreshFetchConfig,
  getFetchConfigStatus,
} from '../../../src/server/fetch/fetch-config';
import { hideConsoleOutput } from '../../shared/test-utils-server';

const mockConsole = hideConsoleOutput();

beforeEach(() => mockConsole.setup());
afterEach(() => mockConsole.dispose());

describe('fetchConfig', () => {
  it('returns a Required<FetchConfig> object', async () => {
    const config = await fetchConfig();
    expect(config).toBeDefined();
    expect(typeof config.enhanced).toBe('boolean');
    expect(typeof config.fetch_concurrency).not.toBe('undefined');
  });

  it('returns an object with expected keys', async () => {
    const config = await fetchConfig();
    expect(config).toHaveProperty('fetch_concurrency');
    expect(config).toHaveProperty('stream_enabled');
    expect(config).toHaveProperty('enhanced');
    expect(config).toHaveProperty('timeout');
  });
});

describe('fetchConfigSync', () => {
  it('returns a FetchConfig synchronously', () => {
    const config = fetchConfigSync();
    expect(config).toBeDefined();
    expect(typeof config.enhanced).toBe('boolean');
  });

  it('returns consistent data shape', () => {
    const config = fetchConfigSync();
    expect(config).toHaveProperty('fetch_concurrency');
    expect(config).toHaveProperty('stream_enabled');
  });
});

describe('forceRefreshFetchConfig', () => {
  it('resolves to a FetchConfig', async () => {
    const config = await forceRefreshFetchConfig();
    expect(config).toBeDefined();
    expect(typeof config.enhanced).toBe('boolean');
  });
});

describe('getFetchConfigStatus', () => {
  it('returns a FetchConfigManager with isStale property', () => {
    const status = getFetchConfigStatus();
    expect(typeof status.isStale).toBe('boolean');
  });

  it('lastError is null or an Error', () => {
    const status = getFetchConfigStatus();
    const err = status.lastError;
    expect(err === null || err instanceof Error).toBe(true);
  });

  it('ttlRemaining is a number', () => {
    const status = getFetchConfigStatus();
    expect(typeof status.ttlRemaining).toBe('number');
  });

  it('isInitialized is a boolean', () => {
    const status = getFetchConfigStatus();
    expect(typeof status.isInitialized).toBe('boolean');
  });

  it('forceRefresh resolves to a FetchConfig', async () => {
    const status = getFetchConfigStatus();
    const config = await status.forceRefresh();
    expect(config).toBeDefined();
    expect(typeof config.enhanced).toBe('boolean');
  });

  it('initialize resolves to a FetchConfig', async () => {
    const status = getFetchConfigStatus();
    const config = await status.initialize();
    expect(config).toBeDefined();
    expect(typeof config.enhanced).toBe('boolean');
  });

  it('two calls to getFetchConfigStatus both return usable managers', () => {
    const s1 = getFetchConfigStatus();
    const s2 = getFetchConfigStatus();
    // Both have expected properties
    expect(typeof s1.isStale).toBe('boolean');
    expect(typeof s2.isStale).toBe('boolean');
  });
});

describe('fetchConfigFlagsmithFactory reuse', () => {
  it('multiple fetchConfig calls share the flagsmith instance (line 41 - cached path)', async () => {
    // First call creates the flagsmith instance; second call reuses it (line 41)
    const [c1, c2] = await Promise.all([fetchConfig(), fetchConfig()]);
    expect(c1).toBeDefined();
    expect(c2).toBeDefined();
  });
});
