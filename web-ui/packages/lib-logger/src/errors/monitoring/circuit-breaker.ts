
import { CircuitBreakerConfig } from './types';

export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',         // Temporary suppression (trigger)
  PERMANENT_OPEN = 'permanent_open', // Permanent suppression (switch)
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private triggerCount: number = 0;
  private switchCount: number = 0;

  private triggerResetTimer: NodeJS.Timeout | null = null;
  private switchResetTimer: NodeJS.Timeout | null = null;
  private triggerTimeoutTimer: NodeJS.Timeout | null = null;

  // Track remaining time for switch TTL to implement pausing
  private switchTtlStart: number = 0;
  private switchTtlRemaining: number;

  constructor(private config: CircuitBreakerConfig) {
    this.switchTtlRemaining = config.switchTtl;
  }

  public recordError(): void {
    if (this.state !== CircuitBreakerState.CLOSED) return;

    // Start trigger window if not started
    if (this.triggerCount === 0) {
      this.startTriggerWindow();
    }

    this.triggerCount++;

    if (this.triggerCount > this.config.triggerMax) {
      this.tripTrigger();
    }
  }

  public getState(): CircuitBreakerState {
    return this.state;
  }

  public reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.triggerCount = 0;
    this.switchCount = 0;
    this.switchTtlRemaining = this.config.switchTtl;
    this.clearTimers();
  }

  private startTriggerWindow() {
    if (this.triggerResetTimer) clearTimeout(this.triggerResetTimer);
    this.triggerResetTimer = setTimeout(() => {
      this.triggerCount = 0;
      this.triggerResetTimer = null;
    }, this.config.triggerTtl);
  }

  private startSwitchWindow() {
    if (this.switchResetTimer) clearTimeout(this.switchResetTimer);
    this.switchTtlStart = Date.now();
    this.switchResetTimer = setTimeout(() => {
      this.switchCount = 0;
      this.switchResetTimer = null;
      this.switchTtlRemaining = this.config.switchTtl;
    }, this.switchTtlRemaining);
  }

  private pauseSwitchWindow() {
    if (this.switchResetTimer) {
      clearTimeout(this.switchResetTimer);
      this.switchResetTimer = null;
      const elapsed = Date.now() - this.switchTtlStart;
      this.switchTtlRemaining = Math.max(0, this.switchTtlRemaining - elapsed);
    }
  }

  private resumeSwitchWindow() {
    // If we have existing counts, resume the timer
    if (this.switchCount > 0) {
      this.startSwitchWindow();
    } else {
      // Reset TTL if no active count
      this.switchTtlRemaining = this.config.switchTtl;
    }
  }

  private tripTrigger() {
    this.state = CircuitBreakerState.OPEN;
    this.triggerCount = 0; // Reset for next cycle
    if (this.triggerResetTimer) clearTimeout(this.triggerResetTimer);

    // Handle Switch Logic
    if (this.switchCount === 0) {
      this.startSwitchWindow();
    }
    this.switchCount++;
    this.pauseSwitchWindow(); // Pause switch TTL while trigger is open

    if (this.switchCount >= this.config.switchMax) {
      this.state = CircuitBreakerState.PERMANENT_OPEN;
      return;
    }

    // Set timeout to reopen
    this.triggerTimeoutTimer = setTimeout(() => {
      if (this.state === CircuitBreakerState.OPEN) {
        this.state = CircuitBreakerState.CLOSED;
        this.resumeSwitchWindow();
      }
    }, this.config.triggerTimeout);
  }

  private clearTimers() {
    if (this.triggerResetTimer) clearTimeout(this.triggerResetTimer);
    if (this.switchResetTimer) clearTimeout(this.switchResetTimer);
    if (this.triggerTimeoutTimer) clearTimeout(this.triggerTimeoutTimer);
  }
}
