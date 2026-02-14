import { activeSessionsGauge, activeToolCallsGauge } from './otel-metrics';
import { log } from '@compliance-theater/logger';
import { DEBUG_MODE } from './otel-metrics';
export class CounterManager {
    #activeCounters = { sessions: 0, toolCalls: 0 };
    getActiveCounters() {
        return { ...this.#activeCounters };
    }
    resetActiveCounters() {
        if (DEBUG_MODE) {
            log((l) => l.debug('Manually resetting active counters', {
                data: {
                    previousSessions: this.#activeCounters.sessions,
                    previousToolCalls: this.#activeCounters.toolCalls,
                },
            }));
        }
        activeSessionsGauge.add(-this.#activeCounters.sessions);
        activeToolCallsGauge.add(-this.#activeCounters.toolCalls);
        this.#activeCounters = { sessions: 0, toolCalls: 0 };
        log((l) => l.warn('Active counters have been manually reset to zero'));
    }
    incrementCounter(type, amount = 1) {
        this.#activeCounters[type] = Math.max(0, this.#activeCounters[type] + amount);
        if (type === 'sessions') {
            activeSessionsGauge.add(amount);
        }
        else {
            activeToolCallsGauge.add(amount);
        }
        if (DEBUG_MODE) {
            log((l) => l.debug(`Incremented ${type} counter`, {
                data: { amount, newValue: this.#activeCounters[type] },
            }));
        }
    }
    decrementCounter(type, amount = 1) {
        const oldValue = this.#activeCounters[type];
        this.#activeCounters[type] = Math.max(0, this.#activeCounters[type] - amount);
        const actualDecrement = oldValue - this.#activeCounters[type];
        if (type === 'sessions') {
            activeSessionsGauge.add(-actualDecrement);
        }
        else {
            activeToolCallsGauge.add(-actualDecrement);
        }
        if (DEBUG_MODE) {
            log((l) => l.debug(`Decremented ${type} counter`, {
                data: {
                    requestedAmount: amount,
                    actualAmount: actualDecrement,
                    newValue: this.#activeCounters[type],
                },
            }));
        }
    }
}
//# sourceMappingURL=counter-manager.js.map