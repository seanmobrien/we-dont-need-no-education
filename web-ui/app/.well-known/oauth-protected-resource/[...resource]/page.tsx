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

const protectedResource = async (req: NextRequest) => {
  try {
    const response =
      req.method === 'OPTIONS'
        ? metadataCorsOptionsRequestHandler()
        : handler(req);
    return response;
  } catch (error) {
    throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'protected-resource',
      message: `Error handling protected resource request: ${error.message}`,
    });
  }
};

export default protectedResource;
