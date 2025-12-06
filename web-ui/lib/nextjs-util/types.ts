import { NextApiRequest, NextApiResponse } from 'next';
import { NextRequest, NextResponse } from 'next/server';

export type LikeNextRequest = NextApiRequest | NextRequest;

export type LikeNextResponse<Data = unknown> =
  | NextApiResponse<Data>
  | NextResponse<Data>;

