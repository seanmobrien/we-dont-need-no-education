export type {
	IServiceContainer,
	IServiceRegistrar,
	ServiceRegistrationOptions,
	ServiceResolver,
	ServiceResolveOptions,
} from './types';

type DependencyInjectionModule = typeof import('./index.browser');

const isNodeRuntime = process.env.NEXTJS_RUNTIME === 'node'
	|| process.env.NEXT_RUNTIME === 'nodejs'
	|| (
		typeof window === 'undefined'
		&& typeof self === 'undefined'
		&& typeof (globalThis as { EdgeRuntime?: unknown }).EdgeRuntime !== 'string'
	);

const runtimeModule = require(
	isNodeRuntime ? './index.node' : './index.browser',
) as DependencyInjectionModule;

export const getServiceContainer = runtimeModule.getServiceContainer;
export const registerServices = runtimeModule.registerServices;
export const resolveService = runtimeModule.resolveService;
export const resetRuntime = runtimeModule.resetRuntime;
export const asClass = runtimeModule.asClass;
export const asFunction = runtimeModule.asFunction;
export const asValue = runtimeModule.asValue;
export const Lifetime = runtimeModule.Lifetime;
