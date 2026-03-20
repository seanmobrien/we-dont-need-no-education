type FetchModule = typeof import('./index.browser');

const isNodeRuntime = process.env.NEXTJS_RUNTIME === 'node'
	|| process.env.NEXT_RUNTIME === 'nodejs'
	|| (
		typeof window === 'undefined'
		&& typeof self === 'undefined'
		&& typeof (globalThis as { EdgeRuntime?: unknown }).EdgeRuntime !== 'string'
	);

const runtimeModule = require(
	isNodeRuntime ? './index.node' : './index.browser',
) as FetchModule;

export const fetch = runtimeModule.fetch;
export const fetchServiceFactory = runtimeModule.fetchServiceFactory;
export const ServiceRegistrar = runtimeModule.ServiceRegistrar;

export type { IFetchService } from '@compliance-theater/types/lib/fetch';

export type {
	RequestInfo,
	RequestInit,
	Response,
	Request,
} from './fetch/shared-types';
