import type { NextApiRequest, NextApiResponse } from 'next';
import type { NextRequest, NextResponse } from 'next/server';
import type { LikeNextRequest, LikeNextResponse } from './types';

/**
 * Type guard to check if the given object is a NextApiRequest or NextRequest.
 *
 * This function verifies that the provided `req` parameter is an object and contains
 * the properties `body` and `method` with the expected types.
 *
 * @param req - The object to check.
 * @returns `true` if `req` is a NextApiRequest or NextRequest, otherwise `false`.
 */
export const isRequestOrApiRequest = (req: unknown): req is LikeNextRequest =>
  typeof req === 'object' &&
  !!req &&
  'body' in req &&
  typeof req.body === 'object' &&
  'method' in req &&
  typeof req.method === 'string';

/**
 * Type guard to check if the request is a NextApiRequest.
 *
 * @param req - The request object to check.
 * @returns True if the request is a NextApiRequest, false otherwise.
 */
export const isNextApiRequest = (req: unknown): req is NextApiRequest =>
  isRequestOrApiRequest(req) &&
  'cookies' in req &&
  typeof req.cookies === 'object' &&
  'query' in req &&
  typeof req.query === 'object';

/**
 * Type guard to check if the request is a NextRequest.
 *
 * @param req - The request object to check.
 * @returns True if the request is a NextRequest, false otherwise.
 */
export const isNextRequest = (req: unknown): req is NextRequest =>
  isRequestOrApiRequest(req) &&
  'headers' in req &&
  typeof req.headers === 'object' &&
  'nextUrl' in req &&
  typeof req.nextUrl === 'object';

/**
 * Determines if the provided object is similar to a Next.js request object.
 *
 * This function returns `true` if the input is recognized as either a Next.js
 * page request or a Next.js API request, based on the `isNextRequest` and
 * `isNextApiRequest` type guards.
 *
 * @param req - The object to test for Next.js request compatibility.
 * @returns `true` if `req` is like a Next.js request, otherwise `false`.
 */
export const isLikeNextRequest = (req: unknown): req is LikeNextRequest =>
  isNextRequest(req) || isNextApiRequest(req);

/**
 * Type guard to check if the given object is a LikeNextResponse.
 *
 * @param res - The object to check.
 * @returns `true` if `res` is a LikeNextResponse, otherwise `false`.
 */
export const isLikeNextResponse = <Data = unknown>(
  res: unknown,
): res is LikeNextResponse<Data> =>
  typeof res === 'object' &&
  !!res &&
  'status' in res &&
  typeof res.status === 'function';

/**
 * Type guard to check if the response is a NextApiResponse.
 *
 * @param res - The response object to check.
 * @returns True if the response is a NextApiResponse, false otherwise.
 */
export const isNextApiResponse = <Data = unknown>(
  res: unknown,
): res is NextApiResponse<Data> =>
  isLikeNextResponse(res) &&
  'json' in res &&
  typeof res.json === 'function' &&
  'getHeader' in res &&
  typeof res.getHeader === 'function';

/**
 * Type guard to check if the response is a NextResponse.
 *
 * @param res - The response object to check.
 * @returns True if the response is a NextResponse, false otherwise.
 */
export const isNextResponse = <Data = unknown>(
  res: unknown,
): res is NextResponse<Data> =>
  isLikeNextResponse<Data>(res) &&
  'cookies' in res &&
  typeof res.cookies === 'object';
