import type { IAfterManager, IAppStartupManager, StartupAccessorCallbackRegistration, TAfterHandler } from '@compliance-theater/types/after';

export const NoopAfterManager: () => IAfterManager = () => ({
    add: (_queueName: string, _handler: TAfterHandler<void>) => true,
    remove: (_queueName: string, _handler: TAfterHandler<void>) => true,
    queue: (_queueName: string, _create?: boolean) => [],
    signal: (_signalName: string) => Promise.resolve(),
});

export const NoopAppStartupManager: () => IAppStartupManager = () => ({
    register: (_handler: TAfterHandler<void>) => true,
    signal: (_signalName: string) => Promise.resolve(),
    getStartupState: () => Promise.resolve('ready'),
    registerAccessor: (_accessor: () => Promise<string>) => { },
    registerStartupAccessorCallback: (_registerAccessor: StartupAccessorCallbackRegistration) => { },
});
