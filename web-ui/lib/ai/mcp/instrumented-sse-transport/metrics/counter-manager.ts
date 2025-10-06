/**
 * @fileoverview Counter Management for MCP Transport
 *
 * This module handles tracking of active sessions and tool calls with
 * safe increment/decrement operations and debugging capabilities.
 */

import { activeSessionsGauge, activeToolCallsGauge } from './otel-metrics';
import { log } from '/lib/logger';
import { DEBUG_MODE } from './otel-metrics';

export interface ActiveCounters {
  sessions: number;
  toolCalls: number;
}

/**
 * Manages active session and tool call counters with safe operations
 */
export class CounterManager {
  #activeCounters: ActiveCounters = { sessions: 0, toolCalls: 0 };

  /**
   * Gets the current count of active sessions and tool calls
   */
  getActiveCounters(): ActiveCounters {
    return { ...this.#activeCounters };
  }

  /**
   * Manually resets all active counters to zero
   * Use this when you suspect counters are out of sync due to errors
   */
  resetActiveCounters(): void {
    if (DEBUG_MODE) {
      log((l) =>
        l.debug('Manually resetting active counters', {
          data: {
            previousSessions: this.#activeCounters.sessions,
            previousToolCalls: this.#activeCounters.toolCalls,
          },
        }),
      );
    }

    // Update metrics to reflect the reset
    activeSessionsGauge.add(-this.#activeCounters.sessions);
    activeToolCallsGauge.add(-this.#activeCounters.toolCalls);

    this.#activeCounters = { sessions: 0, toolCalls: 0 };

    log((l) => l.warn('Active counters have been manually reset to zero'));
  }

  /**
   * Safely increments active counters
   */
  incrementCounter(type: 'sessions' | 'toolCalls', amount: number = 1): void {
    this.#activeCounters[type] = Math.max(
      0,
      this.#activeCounters[type] + amount,
    );

    if (type === 'sessions') {
      activeSessionsGauge.add(amount);
    } else {
      activeToolCallsGauge.add(amount);
    }

    if (DEBUG_MODE) {
      log((l) =>
        l.debug(`Incremented ${type} counter`, {
          data: { amount, newValue: this.#activeCounters[type] },
        }),
      );
    }
  }

  /**
   * Safely decrements active counters (never goes below 0)
   */
  decrementCounter(type: 'sessions' | 'toolCalls', amount: number = 1): void {
    const oldValue = this.#activeCounters[type];
    this.#activeCounters[type] = Math.max(
      0,
      this.#activeCounters[type] - amount,
    );
    const actualDecrement = oldValue - this.#activeCounters[type];

    if (type === 'sessions') {
      activeSessionsGauge.add(-actualDecrement);
    } else {
      activeToolCallsGauge.add(-actualDecrement);
    }

    if (DEBUG_MODE) {
      log((l) =>
        l.debug(`Decremented ${type} counter`, {
          data: {
            requestedAmount: amount,
            actualAmount: actualDecrement,
            newValue: this.#activeCounters[type],
          },
        }),
      );
    }
  }
}
