import { serverEnvFactory, ServerEnvType } from './_server';
import { clientEnvFactory, ClientEnvType } from './_client';
import { isRunningOnClient, isRunningOnServer } from './_common';

export type { ServerEnvType } from './_server';
export type { ClientEnvType } from './_client';

export {
  runtime,
  isRunningOnClient,
  isRunningOnServer,
  isRunningOnEdge,
  isBuilding,
} from './_common';

export type ServerOrClientEnvType = ServerEnvType | ClientEnvType;

export type ServerEnvKey = keyof ServerEnvType;
export type ClientEnvKey = keyof ClientEnvType;
export type ServerOrClientEnvKey = keyof ServerOrClientEnvType;

export type EnvType = ServerEnvType | ClientEnvType;

const APP_ENV = Symbol.for('APP_ENV');

type GlobalWithEnv = typeof globalThis & {
  [APP_ENV]?: EnvType;
};

interface EnvOverloads {
  <TKey extends ServerEnvKey>(key: TKey): Pick<ServerEnvType, TKey>[TKey];
  <TKey extends ClientEnvKey>(key: TKey): Pick<ClientEnvType, TKey>[TKey];
  <TKey extends ServerOrClientEnvKey>(): TKey extends ClientEnvKey
    ? ClientEnvType
    : TKey extends ServerEnvKey
      ? ServerEnvType
      : never;
  (): ServerOrClientEnvType;
}

export const env: EnvOverloads = <TKey extends ServerOrClientEnvKey>(
  key?: TKey,
): ClientEnvType | ServerEnvType | Pick<ServerOrClientEnvType, TKey>[TKey]  => {
  const globalWithEnv = globalThis as GlobalWithEnv;
  let envInstance = globalWithEnv[APP_ENV];
  
  if (!envInstance) {
    envInstance = isRunningOnClient() ? clientEnvFactory() : serverEnvFactory();
    globalWithEnv[APP_ENV] = envInstance;
  }
  if (key === undefined) {
    return envInstance satisfies ServerOrClientEnvType;
  }
  return envInstance[
    key 
  ] satisfies Pick<ServerOrClientEnvType, TKey>[TKey];
};

export const getServerEnv = (): ServerEnvType | null => {
  if (!isRunningOnServer()) {
    return null;
  }
  return env() as ServerEnvType;
};

export const getClientEnv = (): ClientEnvType => {
  return env() as ClientEnvType;
};

/**
 * @internal
 * Clears the cached environment instance. FOR TESTING ONLY.
 * This allows tests to reset the environment between test cases.
 */
export const __clearEnvCacheForTests = (): void => {
  const globalWithEnv = globalThis as GlobalWithEnv;
  delete globalWithEnv[APP_ENV];
};
