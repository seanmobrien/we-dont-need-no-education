import type { NextApiRequest } from 'next';
import type { NextRequest } from 'next/server';

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
	nextUrl?: Pick<URL, 'pathname' | 'search' | 'searchParams' | 'toString'>;
};

type CookieStoreLike = Pick<NextRequest['cookies'], 'get'>;

type CookiesSupport = {
	cookies?: NextApiRequest['cookies'] | CookieStoreLike;
};

type StockBodySupport = {
	body: StockRequestBody;
};

export type LikeNextRequest =
	| (Pick<NextApiRequest, 'method' | 'url' | 'headers'> &
			StockBodySupport &
			Partial<RequestBodyExtractors> &
			RouteSupport &
			QuerySupport &
			NextUrlSupport &
			CookiesSupport)
	| (Pick<NextRequest, 'method' | 'url' | 'headers' | 'cookies'> &
			StockBodySupport &
			RequestBodyExtractors &
			RouteSupport &
			NextUrlSupport &
			QuerySupport &
			CookiesSupport);
