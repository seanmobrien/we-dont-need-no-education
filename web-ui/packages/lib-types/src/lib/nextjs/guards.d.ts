import type { NextApiRequest, NextApiResponse } from 'next';
import type { NextRequest, NextResponse } from 'next/server';
import type { LikeNextRequest } from './types/like-nextrequest';
import type { LikeNextResponse } from './types/like-nextresponse';


/**
 * Type guard to check if the given object is a NextApiRequest or NextRequest.
 *
 * This function verifies that the provided `req` parameter is an object and contains
 * the properties `method` and `headers` with the expected types.
 *
 * @param req - The object to check.
 * @returns `true` if `req` is a LikeNextRequest, otherwise `false`.
 */
export function isRequestOrApiRequest(req: unknown): req is LikeNextRequest;

/**
 * Type guard to check if the request is a NextApiRequest.
 *
 * This function verifies the request object has the structure and properties
 * specific to Next.js Pages Router API requests, including cookies and query objects.
 *
 * @param req - The request object to check.
 * @returns `true` if the request is a NextApiRequest, otherwise `false`.
 */
export function isNextApiRequest(req: unknown): req is NextApiRequest;

/**
 * Type guard to check if the request is a NextRequest.
 *
 * This function verifies the request object has the structure and properties
 * specific to Next.js App Router requests, including the nextUrl object.
 *
 * @param req - The request object to check.
 * @returns `true` if the request is a NextRequest, otherwise `false`.
 */
export function isNextRequest(req: unknown): req is NextRequest;

/**
 * Determines if the provided object is similar to a Next.js request object.
 *
 * This function returns `true` if the input is recognized as either a Next.js
 * App Router request or a Next.js Pages Router API request, based on the
 * `isNextRequest` and `isNextApiRequest` type guards.
 *
 * @param req - The object to test for Next.js request compatibility.
 * @returns `true` if `req` is like a Next.js request, otherwise `false`.
 */
export function isLikeNextRequest(req: unknown): req is LikeNextRequest;

/**
 * Type guard to check if the given object is a LikeNextResponse.
 *
 * This function verifies that the provided `res` parameter is an object
 * with a `status` property that is either a function or number.
 *
 * @param res - The object to check.
 * @returns `true` if `res` is a LikeNextResponse, otherwise `false`.
 */
export function isLikeNextResponse<Data = unknown>(
    res: unknown,
): res is LikeNextResponse<Data>;

/**
 * Type guard to check if the response is a NextApiResponse.
 *
 * This function verifies the response object has the structure and properties
 * specific to Next.js Pages Router API responses, including json, getHeader methods.
 *
 * @param res - The response object to check.
 * @returns `true` if the response is a NextApiResponse, otherwise `false`.
 */
export function isNextApiResponse<Data = unknown>(
    res: unknown,
): res is NextApiResponse<Data>;

/**
 * Type guard to check if the response is a NextResponse.
 *
 * This function verifies the response object has the structure and properties
 * specific to Next.js App Router responses, including headers and cookies objects.
 *
 * @param res - The response object to check.
 * @returns `true` if the response is a NextResponse, otherwise `false`.
 */
export function isNextResponse<Data = unknown>(
    res: unknown,
): res is NextResponse<Data>;

