import type { NextApiRequest } from 'next';
import type { NextRequest } from 'next/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NextUrl = URL | any;

type StockRequestBody = Request['body'];

type RequestBodyExtractors = Pick<
	Request,
	'json' | 'text' | 'arrayBuffer' | 'formData' | 'blob'
>;

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

type CookieStoreLike = Pick<NextRequest['cookies'], 'get'>;

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
	| (Pick<NextRequest, RequiredRequestKeys> &
		StockBodySupport &
		RequestBodyExtractors &
		RouteSupport &
		NextUrlSupport &
		QuerySupport &
		CookiesSupport);
