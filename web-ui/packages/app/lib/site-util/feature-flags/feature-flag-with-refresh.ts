import { LoggedError } from '@compliance-theater/logger';
import { getFeatureFlag } from './server';
import { log } from '@compliance-theater/logger/core';
import { auth } from '@/auth';
import { isKnownFeatureType } from './known-feature';
import { AllFeatureFlagsDefault, type GetFeatureFlagDefault } from './known-feature-defaults';
import type {
  KnownFeatureValueType,
  KnownFeatureType,
  AutoRefreshFeatureFlag,
  AutoRefreshFeatureFlagOptions,
  WellKnownFlagOptions,
  MinimalNodeFlagsmith,
} from './types';
import fastEqual from 'fast-deep-equal/es6';
import { SingletonProvider } from '@compliance-theater/typescript/singleton-provider';
import EventEmitter from '@protobufjs/eventemitter';
import { safeSerialize } from '@compliance-theater/logger/safe-serialize';

const DEFAULT_TTL_MS = 3 * 60 * 1000; // 3 minutes

class AutoRefreshFeatureFlagImpl<T extends KnownFeatureType>
  implements AutoRefreshFeatureFlag<T>
{
  private _value: KnownFeatureValueType<T>;
  private _refreshAt: number;
  private _lastRefreshedAt: number = 0;
  private _pendingRefresh: Promise<KnownFeatureValueType<T>> | null = null;
  private _lastError: Error | null = null;
  private _isDisposed = false;
  private _abortController: AbortController | null = null;
  readonly #eventEmitter = new EventEmitter();
  readonly #flagsmithFactory: (() => MinimalNodeFlagsmith) | undefined;

  private constructor(
    readonly key: T,
    readonly userId: string,
    readonly ttl: number,
    initialValue: KnownFeatureValueType<T>,
    flagsmith?: (() => MinimalNodeFlagsmith) | undefined
  ) {
    this._value = initialValue;
    this._refreshAt = Date.now() + ttl;
    this.ttl = ttl;
    this.userId = userId;
    this.key = key;
    this.#eventEmitter = new EventEmitter();
    this.#flagsmithFactory = flagsmith;
  }

  static createSync<T extends KnownFeatureType>({
    key,
    userId,
    initialValue = undefined,
    ttl = DEFAULT_TTL_MS,
    load = true,
    flagsmith,
  }: {
    key: T;
    userId?: string | 'server';
    ttl?: number;
    initialValue?: KnownFeatureValueType<T>;
    load?: boolean;
    flagsmith?: () => MinimalNodeFlagsmith;
  }): AutoRefreshFeatureFlag<T> {
    const resolvedUserId = userId ?? 'server';
    const instance = new AutoRefreshFeatureFlagImpl<T>(
      key,
      resolvedUserId,
      ttl,
      initialValue as KnownFeatureValueType<T>,
      flagsmith
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
    load = true,
    ttl = DEFAULT_TTL_MS,
    flagsmith,
  }: {
    key: T;
    userId?: string | 'server';
    initialValue?: KnownFeatureValueType<T>;
    ttl?: number;
    load?: boolean;
    flagsmith?: () => MinimalNodeFlagsmith;
  }): Promise<AutoRefreshFeatureFlag<T>> {
    const resolvedUserId = userId ?? (await auth())?.user?.hash ?? 'server';
    const instance = new AutoRefreshFeatureFlagImpl<T>(
      key,
      resolvedUserId,
      ttl,
      initialValue as KnownFeatureValueType<T>,
      flagsmith
    );

    // If no initial value provided, fetch immediately
    if (load || initialValue === undefined) {
      await instance.refreshValue().catch((error) => {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: `FeatureFlag:${key}/refresh-value`,
        });
      });
    }
    return instance;
  }

  get value(): KnownFeatureValueType<T> {
    if (this._isDisposed) {
      throw new Error(`Feature flag "${this.key}" has been disposed`);
    }

    // Trigger refresh asynchronously without blocking
    if (this.isStale && !this._pendingRefresh) {
      new Promise(async (resolve, reject) => {
        try {
          const ret = await this.refreshValue();
          resolve(ret);
        } catch (e) {
          reject(e);
        }
      }).catch((error) => {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: `FeatureFlag:${this.key}/refresh-value`,
        });
        return Promise.resolve(this._value);
      });
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

  get isEnabled(): boolean {
    const check = this.value;
    return Boolean(check);
  }

  get isInitialized(): boolean {
    return this._lastRefreshedAt > 0;
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  addOnChangedListener(listener: () => void): void {
    this.#eventEmitter.on('change', listener);
  }
  removeOnChangedListener(listener: () => void): void {
    this.#eventEmitter.off('change', listener);
  }
  addOnDisposedListener(listener: () => void): void {
    this.#eventEmitter.on('dispose', listener);
  }
  removeOnDisposedListener(listener: () => void): void {
    this.#eventEmitter.off('dispose', listener);
  }

  public equals(check: KnownFeatureValueType<T>): boolean {
    return fastEqual(this._value, check);
  }

  private async refreshValue(): Promise<KnownFeatureValueType<T>> {
    // Reuse in-flight request to prevent concurrent refreshes
    if (this._pendingRefresh) {
      return this._pendingRefresh;
    }

    // Clear previous error
    this._lastError = null;

    // Create abort controller for cancellation support
    this._abortController = new AbortController();
    const originalValue = this._value;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this;
    let didValueChange = false;
    const pending = getFeatureFlag<T>(this.key, {
      userId: this.userId,
      flagsmith: this.#flagsmithFactory,
    })
      .then((newValue) => {
        if (that._isDisposed) {
          return [that._value, false] as const;
        }
        let valueUpdated = false;
        let firstRefresh = false;
        const currentValue = newValue as KnownFeatureValueType<T>;
        const now = Date.now();
        // If we've never refreshed before then always treat as an update.
        // This supports the transition from defaultValue/not loaded to loaded.
        if (that._lastRefreshedAt === 0) {
          firstRefresh = true;
          that._lastRefreshedAt = now;
          valueUpdated = true;
        }
        that._refreshAt = now + that.ttl;

        if (!that.equals(currentValue)) {
          that._value = currentValue;
          that._lastRefreshedAt = now;
          valueUpdated = true;
          log((l) =>
            l.verbose(
              `Feature flag "${this.key}" ${
                firstRefresh ? 'initial value loaded' : 'refreshed'
              } for user ${this.userId}. New value: ${safeSerialize(newValue)}`
            )
          );
        }

        return [that._value, valueUpdated] as const;
      })
      .then(([v, valueUpdated]) => {
        // If value changed set the changed bit so we know
        if (valueUpdated) {
          didValueChange = true;
        }
        // And then return raw value
        return v;
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
        return Promise.resolve(this._value);
      })
      .finally(() => {
        this._pendingRefresh = null;
        this._abortController = null;
      });
    this._pendingRefresh = pending;
    const ret = await pending;
    if (didValueChange) {
      Promise.resolve().then(() => {
        try {
          this.#eventEmitter.emit('change', {
            sender: this,
            oldValue: originalValue,
            newValue: this._value,
          });
        } catch (error) {
          LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: `FeatureFlag:${this.key}/event-emitter:change`,
          });
        }
      });
    }
    return ret;
  }

  forceRefresh(): Promise<KnownFeatureValueType<T>> {
    if (this._isDisposed) {
      throw new Error(`Cannot refresh disposed feature flag "${this.key}"`);
    }
    return this.refreshValue();
  }
  async forceInitialize(): Promise<AutoRefreshFeatureFlag<T>> {
    if (this.isInitialized) {
      return this;
    }
    await this.refreshValue();
    return this;
  }

  [Symbol.dispose](): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    // Clear all events
    this.#eventEmitter.off();
    // Cancel any pending refresh
    this._abortController?.abort();
    this._pendingRefresh = null;

    log((l) =>
      l.debug(`Feature flag "${this.key}" disposed for user ${this.userId}`)
    );
  }
}

export const createAutoRefreshFeatureFlag = <T extends KnownFeatureType>(
  options: AutoRefreshFeatureFlagOptions<T>
): Promise<AutoRefreshFeatureFlag<T>> =>
  AutoRefreshFeatureFlagImpl.create<T>(options);

export const createAutoRefreshFeatureFlagSync = <T extends KnownFeatureType>(
  options: AutoRefreshFeatureFlagOptions<T>
): AutoRefreshFeatureFlag<T> =>
  AutoRefreshFeatureFlagImpl.createSync<T>(options);

const setupSingleton = <
  T extends KnownFeatureType,
  R extends AutoRefreshFeatureFlag<T>
>(
  sym: symbol,
  target: R
): R => {
  if (!target) {
    return target;
  }
  // note it should never be null, but just in case
  if (
    target &&
    'addOnDisposedListener' in target &&
    typeof target.addOnDisposedListener === 'function'
  ) {
    target.addOnDisposedListener(() => {
      SingletonProvider.Instance.delete(sym);
    });
  }
  return target;
};
const makeKey = <T extends KnownFeatureType>(
  key: T,
  salt: string | undefined,
  userId: string | undefined
): symbol => {
  const fullSalt = `${salt ? salt + ':' : ''}${
    userId ?? (salt ? '' : '--none--')
  }`;
  return Symbol.for(
    `@no-education/features-flags/auto-refresh/${key}::${fullSalt}`
  );
};

const normalizeWellKnownOptions = (
  input: string | WellKnownFlagOptions | undefined
): WellKnownFlagOptions => {
  if (typeof input === 'string') {
    return { userId: input };
  }
  return input ?? {};
};

export const wellKnownFlag = <T extends KnownFeatureType>(
  key: T,
  options?: string | WellKnownFlagOptions
): Promise<AutoRefreshFeatureFlag<T>> => {
  const { userId, salt, ...restOfOptions } = normalizeWellKnownOptions(options);
  if (!isKnownFeatureType(key)) {
    throw new TypeError(`Invalid KnownFeatureType key: ${String(key)}`);
  }
  if (restOfOptions.flagsmith && !salt) {
    throw new TypeError(
      `When providing a custom Flagsmith instance, a unique salt must be provided to avoid collisions.`
    );
  }
  const sym = makeKey(key, salt, userId);
  return SingletonProvider.Instance.getRequiredAsync(
    sym,
    async () => {
      const flag = await createAutoRefreshFeatureFlag<T>({
        key: key,
        userId: userId ?? 'server',
        ...restOfOptions,
      });
      return setupSingleton(sym, flag);
    },
    { weakRef: false }
  )!;
};

export const wellKnownFlagSync = <T extends KnownFeatureType>(
  key: T,
  options?: string | WellKnownFlagOptions
): AutoRefreshFeatureFlag<T> => {
  const { salt, userId, ...restOfOptions } = normalizeWellKnownOptions(options);
  if (!isKnownFeatureType(key)) {
    throw new TypeError(`Invalid KnownFeatureType key: ${String(key)}`);
  }
  if (restOfOptions.flagsmith && !salt) {
    throw new TypeError(
      `When providing a custom Flagsmith instance, a unique salt must be provided to avoid collisions.`
    );
  }
  const sym = makeKey(key, salt, userId);
  return SingletonProvider.Instance.getRequired(
    sym,
    () =>
      setupSingleton(
        sym,
        createAutoRefreshFeatureFlagSync<T>({
          key: key,
          userId: userId ?? 'server',
          initialValue: AllFeatureFlagsDefault[key] as (GetFeatureFlagDefault<T> | undefined),
          load: true,
          ...restOfOptions,
        })
      ),
    {
      weakRef: false,
    }
  );
};

/**
 * Type guard to determine if value is an AutoRefreshFeatureFlag.
 * @param value The value to check
 * @returns True if the value is an AutoRefreshFeatureFlag, false otherwise
 */
export const isAutoRefreshFeatureFlag = <
  T extends KnownFeatureType = KnownFeatureType
>(
  value: unknown
): value is AutoRefreshFeatureFlag<T> =>
  typeof value === 'object' &&
  value !== null &&
  'key' in value &&
  'addOnChangedListener' in value &&
  typeof (value as Record<string, unknown>).addOnChangedListener ===
    'function' &&
  'removeOnChangedListener' in value &&
  typeof (value as Record<string, unknown>).removeOnChangedListener ===
    'function' &&
  'forceRefresh' in value &&
  typeof (value as Record<string, unknown>).forceRefresh === 'function' &&
  'value' in value &&
  'isStale' in value &&
  'isEnabled' in value &&
  'isDisposed' in value &&
  'isInitialized' in value &&
  typeof value.isDisposed === 'boolean' &&
  typeof value.isInitialized === 'boolean' &&
  typeof value.isStale === 'boolean' &&
  typeof value.isEnabled === 'boolean' &&
  'forceRefresh' in value &&
  typeof (value as Record<string, unknown>).forceRefresh === 'function';
