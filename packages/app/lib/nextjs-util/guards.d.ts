import type { NextApiRequest, NextApiResponse } from 'next';
import type { NextRequest, NextResponse } from 'next/server';
import type { LikeNextRequest, LikeNextResponse } from './types';

declare module '@/lib/nextjs-util/guards' {
  /**
   * Type guard to check if the given object is a NextApiRequest or NextRequest.
   *
   * This function verifies that the provided `req` parameter is an object and contains
   * the properties `body` and `method` with the expected types.
   *
   * @param req - The object to check.
   * @returns `true` if `req` is a NextApiRequest or NextRequest, otherwise `false`.
   */
  export function isRequestOrApiRequest(req: unknown): req is LikeNextRequest;

  /**
   * Type guard to check if the request is a NextApiRequest.
   *
   * @param req - The request object to check.
   * @returns True if the request is a NextApiRequest, false otherwise.
   */
  export function isNextApiRequest(req: unknown): req is NextApiRequest;

  /**
   * Type guard to check if the request is a NextRequest.
   *
   * @param req - The request object to check.
   * @returns True if the request is a NextRequest, false otherwise.
   */
  export function isNextRequest(req: unknown): req is NextRequest;

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
  export function isLikeNextRequest(req: unknown): req is LikeNextRequest;

  /**
   * Type guard to check if the given object is a LikeNextResponse.
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
   * @param res - The response object to check.
   * @returns True if the response is a NextApiResponse, false otherwise.
   */
  export function isNextApiResponse<Data = unknown>(
    res: unknown,
  ): res is NextApiResponse<Data>;

  /**
   * Type guard to check if the response is a NextResponse.
   *
   * @param res - The response object to check.
   * @returns True if the response is a NextResponse, false otherwise.
   */
  export function isNextResponse<Data = unknown>(
    res: unknown,
  ): res is NextResponse<Data>;
}
