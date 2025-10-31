import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { getFeatureFlag } from './server';
import { log } from '@/lib/logger/core';
import { auth } from '@/auth';
import { FeatureFlagValueType, KnownFeatureType } from './known-feature';
import fastEqual from 'fast-deep-equal/es6';

const DEFAULT_TTL_MS = 3 * 60 * 1000; // 3 minutes

export type AutoRefreshFeatureFlag<T extends KnownFeatureType> = {
  get value(): FeatureFlagValueType<T>;
  get lastError(): Error | null;
  get expiresAt(): number;
  get ttlRemaining(): number;
  get isStale(): boolean;
  get userId(): string;
  get isDisposed(): boolean;
  forceRefresh(): Promise<FeatureFlagValueType<T>>;
  dispose(): void;
};

class AutoRefreshFeatureFlagImpl<T extends KnownFeatureType>
  implements AutoRefreshFeatureFlag<T>
{
  private _value: FeatureFlagValueType<T>;
  private _refreshAt: number;
  private _pendingRefresh: Promise<FeatureFlagValueType<T>> | null = null;
  private _lastError: Error | null = null;
  private _isDisposed = false;
  private _abortController: AbortController | null = null;

  private constructor(
    readonly key: T,
    readonly userId: string,
    readonly ttl: number,
    initialValue: FeatureFlagValueType<T>,
  ) {
    this._value = initialValue;
    this._refreshAt = Date.now() + ttl;
    this.ttl = ttl;
    this.userId = userId;
    this.key = key;
  }

  static createSync<T extends KnownFeatureType>({
    key,
    userId,
    initialValue = undefined,
    ttl = DEFAULT_TTL_MS,
    load = true,
  }: {
    key: T;
    userId?: string | 'server';
    ttl?: number;
    initialValue?: FeatureFlagValueType<T>;
    load?: boolean;
  }): AutoRefreshFeatureFlag<T> {
    const resolvedUserId = userId ?? 'server';
    const instance = new AutoRefreshFeatureFlagImpl<T>(
      key,
      resolvedUserId,
      ttl,
      initialValue as FeatureFlagValueType<T>,
    );
    if (load) {
      instance.forceRefresh();
    }
    return instance;
  }

  static async create<T extends KnownFeatureType>({
    key,
    userId,
    initialValue = undefined,
    load = false,
    ttl = DEFAULT_TTL_MS,
  }: {
    key: T;
    userId?: string | 'server';
    initialValue?: FeatureFlagValueType<T>;
    ttl?: number;
    load?: boolean;
  }): Promise<AutoRefreshFeatureFlag<T>> {
    const resolvedUserId = userId ?? (await auth())?.user?.hash ?? 'server';
    const instance = new AutoRefreshFeatureFlagImpl<T>(
      key,
      resolvedUserId,
      ttl,
      initialValue as FeatureFlagValueType<T>,
    );

    // If no initial value provided, fetch immediately
    if (load || initialValue === undefined) {
      await instance.refreshValue();
    }
    return instance;
  }

  get value(): FeatureFlagValueType<T> {
    if (this._isDisposed) {
      throw new Error(`Feature flag "${this.key}" has been disposed`);
    }

    // Trigger refresh asynchronously without blocking
    if (this.isStale && !this._pendingRefresh) {
      this.refreshValue();
    }

    return this._value;
  }

  get lastError(): Error | null {
    return this._lastError;
  }

  get expiresAt(): number {
    return this._refreshAt;
  }

  get ttlRemaining(): number {
    return Math.max(0, this._refreshAt - Date.now());
  }

  get isStale(): boolean {
    return Date.now() > this._refreshAt;
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  private equals(check: FeatureFlagValueType<T>): boolean {
    return fastEqual(this._value, check);
  }

  private async refreshValue(): Promise<FeatureFlagValueType<T>> {
    // Reuse in-flight request to prevent concurrent refreshes
    if (this._pendingRefresh) {
      return this._pendingRefresh;
    }

    // Clear previous error
    this._lastError = null;

    // Create abort controller for cancellation support
    this._abortController = new AbortController();

    this._pendingRefresh = getFeatureFlag<T>(this.key, this.userId)
      .then((newValue) => {
        if (this._isDisposed) {
          return this._value;
        }

        const currentValue = newValue as FeatureFlagValueType<T>;
        this._refreshAt = Date.now() + this.ttl;

        if (!this.equals(currentValue)) {
          this._value = currentValue;
          log((l) =>
            l.verbose(
              `Feature flag "${this.key}" refreshed for user ${this.userId}:`,
              { newValue },
            ),
          );
        }

        return this._value;
      })
      .catch((error) => {
        if (this._isDisposed) {
          return this._value;
        }

        const loggedError = LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: `FeatureFlag:${this.key}`,
          message: `Failed to refresh feature flag "${this.key}" for user ${this.userId}: ${error.message}`,
        });

        this._lastError = loggedError;
        return this._value;
      })
      .finally(() => {
        this._pendingRefresh = null;
        this._abortController = null;
      });

    return this._pendingRefresh;
  }

  async forceRefresh(): Promise<FeatureFlagValueType<T>> {
    if (this._isDisposed) {
      throw new Error(`Cannot refresh disposed feature flag "${this.key}"`);
    }

    const value = await this.refreshValue();

    // If refresh succeeded, reset refresh time
    if (!this._lastError) {
      this._refreshAt = Date.now() + this.ttl;
    }

    return value;
  }

  dispose(): void {
    if (this._isDisposed) {
      return;
    }

    this._isDisposed = true;

    // Cancel any pending refresh
    this._abortController?.abort();
    this._pendingRefresh = null;

    log((l) =>
      l.debug(`Feature flag "${this.key}" disposed for user ${this.userId}`),
    );
  }
}

type AutoRefreshFeatureFlagOptions<T extends KnownFeatureType> = {
  key: T;
  userId?: string | 'server';
  initialValue?: FeatureFlagValueType<T>;
  ttl?: number;
  load?: boolean;
};

export const createAutoRefreshFeatureFlag = async <T extends KnownFeatureType>(
  options: AutoRefreshFeatureFlagOptions<T>,
): Promise<AutoRefreshFeatureFlag<T>> =>
  AutoRefreshFeatureFlagImpl.create<T>(options);

export const createAutoRefreshFeatureFlagSync = <T extends KnownFeatureType>(
  options: AutoRefreshFeatureFlagOptions<T>,
): AutoRefreshFeatureFlag<T> =>
  AutoRefreshFeatureFlagImpl.createSync<T>(options);
