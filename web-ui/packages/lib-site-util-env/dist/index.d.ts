import { ServerEnvType } from './_server';
import { ClientEnvType } from './_client';
import { runtime, isRunningOnClient, isRunningOnServer, isRunningOnEdge } from './_common';
export { runtime, isRunningOnClient, isRunningOnServer, isRunningOnEdge };
export type { ServerEnvType, ClientEnvType };
export type ServerEnvKey = keyof ServerEnvType;
export type ClientEnvKey = keyof ClientEnvType;
export type EnvType = typeof window extends 'undefined' ? ServerEnvType : typeof window extends undefined ? ServerEnvType : ClientEnvType;
interface EnvOverloads {
    <TKey extends ServerEnvKey>(key: TKey): Pick<ServerEnvType, TKey>[TKey];
    <TKey extends ClientEnvKey>(key: TKey): Pick<ClientEnvType, TKey>[TKey];
    <TKey extends ClientEnvKey | ServerEnvKey>(): TKey extends ClientEnvKey ? ClientEnvType : TKey extends ServerEnvKey ? ServerEnvType : never;
    (): ClientEnvType | ServerEnvType;
}
export declare const env: EnvOverloads;
//# sourceMappingURL=index.d.ts.map