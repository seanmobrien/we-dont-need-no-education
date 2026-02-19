import { NextApiRequest, NextApiResponse } from '@compliance-theater/types/next';
import { NextRequest, NextResponse } from '@compliance-theater/types/next/server';

export type LikeNextRequest = NextApiRequest | NextRequest;

export type LikeNextResponse<Data = unknown> =
  | NextApiResponse<Data>
  | NextResponse<Data>;
