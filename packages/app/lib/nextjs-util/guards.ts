import type { NextApiRequest, NextApiResponse } from 'next';
import type { NextRequest, NextResponse } from 'next/server';
import type { LikeNextRequest, LikeNextResponse } from './types';

export const isRequestOrApiRequest = (req: unknown): req is LikeNextRequest =>
  typeof req === 'object' &&
  !!req &&
  'body' in req &&
  typeof req.body === 'object' &&
  'method' in req &&
  typeof req.method === 'string';

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
  typeof res.status === 'function';

export const isNextApiResponse = <Data = unknown>(
  res: unknown,
): res is NextApiResponse<Data> =>
  isLikeNextResponse(res) &&
  'json' in res &&
  typeof res.json === 'function' &&
  'getHeader' in res &&
  typeof res.getHeader === 'function';

export const isNextResponse = <Data = unknown>(
  res: unknown,
): res is NextResponse<Data> =>
  isLikeNextResponse<Data>(res) &&
  'cookies' in res &&
  typeof res.cookies === 'object';
