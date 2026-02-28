import { singletonProviderFactory } from '@compliance-theater/logger/singleton-provider';
import type { AppStartupState } from '@compliance-theater/types/after';

export type { AppStartupState } from '@compliance-theater/types/after';

class AppStartupStateSingleton {
  #state: AppStartupState = 'pending';

  getState(): AppStartupState {
    return this.#state;
  }

  setState(next: AppStartupState): AppStartupState {
    this.#state = next;
    return this.#state;
  }
}

const APP_STARTUP_STATE_SINGLETON_KEY = '@noeducation/app-startup-state';

const instance = (): AppStartupStateSingleton => {
  const singletonProvider = singletonProviderFactory();
  if (!singletonProvider) {
    throw new Error('Singleton provider is not available');
  }

  return singletonProvider.getOrCreate(
    APP_STARTUP_STATE_SINGLETON_KEY,
    () => new AppStartupStateSingleton(),
  )!;
};

export const setState = (next: AppStartupState): AppStartupState =>
  instance().setState(next);

export const state = (): AppStartupState => instance().getState();
