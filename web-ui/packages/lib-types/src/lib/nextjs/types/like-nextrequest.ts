import type { NextApiRequest } from 'next';

type NextUrl = URL | { pathname?: string; searchParams?: URLSearchParams };

type RequestBodyExtractors = {
	json: () => Promise<unknown>;
	text: () => Promise<string>;
	arrayBuffer: () => Promise<unknown>;
	formData: () => Promise<unknown>;
	blob: () => Promise<unknown>;
};

type FetchRequest = {
	method: string;
	url: string;
	headers: unknown;
	cookies: CookieStoreLike;
	bodyUsed: boolean;
	clone: () => unknown;
	signal: unknown;
	referrerPolicy?: unknown;
	redirect?: unknown;
	referrer?: string;
	cache?: unknown;
	credentials?: unknown;
	destination?: unknown;
	integrity?: string;
	keepalive?: boolean;
	mode?: unknown;
	page?: unknown;
	ua?: unknown;
	bytes?: () => Promise<unknown>;
};

type StockRequestBody = NextApiRequest['body'];

type RouteParams = Record<string, string | string[] | undefined>;

type RouteSupport = {
	params?: RouteParams | Promise<RouteParams>;
	route?: string;
};

type QuerySupport = {
	query?: RouteParams;
};

type NextUrlSupport = {
	nextUrl?: NextUrl;
};

type CookieStoreLike = {
	get: (name: string) => unknown;
};

type CookiesSupport = {
	cookies?: NextApiRequest['cookies'] | CookieStoreLike;
};

type StockBodySupport = {
	body: StockRequestBody;
};

type BaseRequiredRequestKeys = 'method' | 'url' | 'headers' | 'cookies';
type RequiredRequestKeys = BaseRequiredRequestKeys | 'bodyUsed' | 'bytes' | 'clone' | 'signal' | 'referrerPolicy' |
	'redirect' | 'referrer' | 'cache' | 'credentials' | 'destination' | 'integrity' | 'keepalive' | 'mode' | 'page' |
	'ua';


export type LikeNextRequest =
	| (Pick<NextApiRequest, BaseRequiredRequestKeys> &
		StockBodySupport &
		Partial<RequestBodyExtractors> &
		RouteSupport &
		QuerySupport &
		NextUrlSupport &
		CookiesSupport)
	| (Pick<FetchRequest, RequiredRequestKeys> &
		StockBodySupport &
		RequestBodyExtractors &
		RouteSupport &
		NextUrlSupport &
		QuerySupport &
		CookiesSupport);
