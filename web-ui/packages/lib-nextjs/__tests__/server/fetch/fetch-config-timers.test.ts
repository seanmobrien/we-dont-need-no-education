/* @jest-environment node */

/**
 * Tests for fetchConfigFlagsmithFactory cleanup setTimeout (lines 50-68).
 *
 * Must be a SEPARATE test file so the module is loaded fresh (own worker process,
 * own module registry) and fetchConfigFlagsmith starts as undefined.
 *
 * Fake timers are activated in beforeAll, BEFORE any test code calls fetchConfig(),
 * so the setTimeout inside fetchConfigFlagsmithFactory uses the fake timer.
 */

import {
  fetchConfig,
} from '../../../src/server/fetch/fetch-config';
import { hideConsoleOutput } from '../../shared/test-utils-server';

const mockConsole = hideConsoleOutput();

beforeAll(() => {
  // Activate fake timers before any test runs so that the setTimeout inside
  // fetchConfigFlagsmithFactory registers against fake timers.
  jest.useFakeTimers();
});

afterAll(() => {
  jest.useRealTimers();
});

beforeEach(() => mockConsole.setup());
afterEach(() => mockConsole.dispose());

describe('fetchConfigFlagsmithFactory - cleanup setTimeout (lines 50-68)', () => {
  it('runs the cleanup callback after the 5-minute timeout', async () => {
    // First call creates the flagsmith instance and schedules the cleanup setTimeout.
    // Because fake timers are already active, the setTimeout is a fake timer.
    await fetchConfig();

    // Advance time past FETCH_CONFIG_SERVER_TIMEOUT (5 * 60 * 1000) to fire the cleanup.
    await jest.advanceTimersByTimeAsync(5 * 60 * 1000 + 100);

    // If we reach here, the async callback (lines 50-68) ran without unhandled errors.
  });
});
