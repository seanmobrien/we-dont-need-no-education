type ContainerModule = typeof import('./container.browser');

const isNodeRuntime = process.env.NEXTJS_RUNTIME === 'node'
	|| process.env.NEXT_RUNTIME === 'nodejs'
	|| (
		typeof window === 'undefined'
		&& typeof self === 'undefined'
		&& typeof (globalThis as { EdgeRuntime?: unknown }).EdgeRuntime !== 'string'
	);

const runtimeModule = require(
	isNodeRuntime ? './container.node' : './container.browser',
) as ContainerModule;

export const getServiceContainer = runtimeModule.getServiceContainer;
export const registerServices = runtimeModule.registerServices;
export const resolveService = runtimeModule.resolveService;
export const resetRuntime = runtimeModule.resetRuntime;
export const asClass = runtimeModule.asClass;
export const asFunction = runtimeModule.asFunction;
export const asValue = runtimeModule.asValue;
export const Lifetime = runtimeModule.Lifetime;
export const InjectionMode = runtimeModule.InjectionMode;
