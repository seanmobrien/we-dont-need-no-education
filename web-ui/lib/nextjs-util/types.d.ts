declare module '@/lib/nextjs-util/types' {
  import { NextApiRequest, NextApiResponse } from 'next';
  import { NextRequest, NextResponse } from 'next/server';

  /**
   * A type alias that represents a request in a Next.js application.
   * It can be either a `NextApiRequest` from the `next` module or a
   * `NextRequest` from the `next/server` module.
   *
   * @type {NextApiRequest | NextRequest} LikeNextRequest
   */
  export type LikeNextRequest = NextApiRequest | NextRequest;

  /**
   * A type alias that represents a response in a Next.js application.
   * It can be either a `NextApiResponse` from the `next` module or a
   * `NextResponse` from the `next/server` module.
   *
   * @type {NextApiResponse<Data> | NextResponse<Data>} LikeNextResponse
   */
  export type LikeNextResponse<Data = unknown> =
    | NextApiResponse<Data>
    | NextResponse<Data>;
}
