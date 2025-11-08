import { LoggedError } from '@/lib/react-util';
import { env } from '@/lib/site-util/env';
import {
  protectedResourceHandler,
  metadataCorsOptionsRequestHandler,
} from 'mcp-handler';
import { NextRequest } from 'next/server';

const handler = protectedResourceHandler({
  authServerUrls: [env('AUTH_KEYCLOAK_ISSUER')!],
});

const protectedResource = async (req: NextRequest): Promise<void> => {
  try {
    const response =
      req.method === 'OPTIONS'
        ? metadataCorsOptionsRequestHandler()
        : handler(req);
    return response as unknown as Promise<void>;
  } catch (error) {
    throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'protected-resource',
    });
  }
};

export default protectedResource;
