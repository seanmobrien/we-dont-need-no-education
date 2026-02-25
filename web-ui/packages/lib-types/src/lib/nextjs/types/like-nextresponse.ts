import type { NextApiResponse } from 'next';
import type { NextResponse } from 'next/server';

export type LikeNextResponse<Data = unknown> =
    | Pick<
        NextApiResponse<Data>,
        'status' | 'json' | 'send' | 'end' | 'setHeader' | 'getHeader'
    >
    | Pick<NextResponse<Data>, 'status' | 'headers' | 'json'>;

