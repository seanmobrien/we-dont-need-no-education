

export type ServiceRegistrationOptions = {
    lifetime?: BrowserLifetime;
};

/**
 * Optional resolve options.
 */
export interface ResolveOptions {
    /**
     * If `true` and `resolve` cannot find the requested dependency,
     * returns `undefined` rather than throwing an error.
     */
    allowUnregistered?: boolean;
};
/**
 * The options when registering a class, function or value.
 * @type RegistrationOptions
 */
export interface ResolverOptions<T> {
    /**
     * Only used for inline configuration with `loadModules`.
     */
    name?: string;
    /**
     * Lifetime setting.
     */
    lifetime?: BrowserLifetime;
    /**
     * Registration function to use. Only used for inline configuration with `loadModules`.
     */
    register?: (...args: any[]) => Resolver<T>;
    /**
     * True if this resolver should be excluded from lifetime leak checking. Used by resolvers that
     * wish to uphold the anti-leakage contract themselves. Defaults to false.
     */
    isLeakSafe?: boolean;
}

/**
 * A resolver object returned by asClass(), asFunction() or asValue().
 */
export interface Resolver<T> extends ResolverOptions<T> {
    resolve<TCradle extends Record<string | symbol | number, any>>(container: TCradle): T;
}
export type ServiceResolver<T = any> = Resolver<T>;

export type ServiceResolveOptions = ResolveOptions;

export interface IServiceRegistrarOverload {
    (
        registrations: Record<string | symbol | number, ServiceResolver>
    ): void;
    (name: string | symbol | number, resolver: ServiceResolver): void;
    <T>(name: string | symbol | number, resolver: ServiceResolver<T>): void;
    <T>(name: string | symbol | number, resolver: ((state: unknown) => T)): void;
}

export interface IServiceRegistrar {
    register: (container: IServiceContainer) => void;
}

export interface IServiceContainer {
    resolve<T>(
        name: string | symbol | number,
        options?: ServiceResolveOptions
    ): T;

    has(name: string | symbol | number, resolver?: ServiceResolver<unknown>): boolean;

    register(
        registrations: Record<string | symbol | number, ServiceResolver>
    ): void;
    register(name: string | symbol | number, resolver: ServiceResolver): void;
    register<T>(name: string | symbol | number, resolver: ServiceResolver<T>): void;
    register<T>(name: string | symbol | number, resolver: ((state: unknown) => T)): void;

    createScope(): IServiceContainer;

    [Symbol.asyncDispose](): Promise<void>;
}


export type BrowserLifetime = 'SINGLETON' | 'SCOPED' | 'TRANSIENT';

export type BrowserResolverKind = 'value' | 'class' | 'function';

export type BrowserResolverRecord<T = any> = {
    resolve<TCradle extends Record<string | symbol | number, unknown>>(container: TCradle): T;
    kind: BrowserResolverKind;
    allowUnregistered?: never;
    tag?: unknown;
    lifetime: BrowserLifetime;
    setLifetime: (lifetime: unknown) => BrowserResolverRecord;
    singleton: () => BrowserResolverRecord;
    scoped: () => BrowserResolverRecord;
    transient: () => BrowserResolverRecord;
    inject: (_injector: unknown) => BrowserResolverRecord;
    is: (resolver: unknown) => boolean;
};

export type ContainerRuntime = {
    createContainer: (options?: {
        injectionMode?: unknown;
        strict?: boolean;
    }) => IServiceContainer;
    asClass: (...args: unknown[]) => unknown;
    asFunction: (...args: unknown[]) => unknown;
    asValue: (...args: unknown[]) => unknown;
};
