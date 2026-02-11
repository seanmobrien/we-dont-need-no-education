import type { NextApiRequest, NextApiResponse } from 'next';
import type { NextRequest, NextResponse } from 'next/server';
import type { LikeNextRequest, LikeNextResponse } from './nextjs-types';

export const isRequestOrApiRequest = (req: unknown): req is LikeNextRequest =>
  typeof req === 'object' &&
  !!req &&
  'method' in req &&
  typeof (req as { method?: unknown }).method === 'string' &&
  'headers' in req &&
  typeof (req as { headers?: unknown }).headers === 'object';

export const isNextApiRequest = (req: unknown): req is NextApiRequest =>
  isRequestOrApiRequest(req) &&
  'cookies' in req &&
  typeof req.cookies === 'object' &&
  'query' in req &&
  typeof req.query === 'object';

export const isNextRequest = (req: unknown): req is NextRequest =>
  isRequestOrApiRequest(req) &&
  'headers' in req &&
  typeof req.headers === 'object' &&
  'nextUrl' in req &&
  typeof req.nextUrl === 'object';

export const isLikeNextRequest = (req: unknown): req is LikeNextRequest =>
  isNextRequest(req) || isNextApiRequest(req);

export const isLikeNextResponse = <Data = unknown>(
  res: unknown,
): res is LikeNextResponse<Data> =>
  typeof res === 'object' &&
  !!res &&
  'status' in res &&
  (typeof (res as { status?: unknown }).status === 'function' ||
    typeof (res as { status?: unknown }).status === 'number');

export const isNextApiResponse = <Data = unknown>(
  res: unknown,
): res is NextApiResponse<Data> =>
  isLikeNextResponse(res) &&
  typeof (res as { status?: unknown }).status === 'function' &&
  'json' in res &&
  typeof (res as { json?: unknown }).json === 'function' &&
  'getHeader' in res &&
  typeof (res as { getHeader?: unknown }).getHeader === 'function';

export const isNextResponse = <Data = unknown>(
  res: unknown,
): res is NextResponse<Data> =>
  isLikeNextResponse<Data>(res) &&
  typeof (res as { status?: unknown }).status === 'number' &&
  'headers' in res &&
  typeof (res as { headers?: unknown }).headers === 'object' &&
  'cookies' in res &&
  typeof (res as { cookies?: unknown }).cookies === 'object';
