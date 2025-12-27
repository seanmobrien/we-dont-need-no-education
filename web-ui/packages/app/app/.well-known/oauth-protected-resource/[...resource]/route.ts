import { env } from '@repo/lib-site-util-env';
import {
  protectedResourceHandler,
  metadataCorsOptionsRequestHandler,
} from 'mcp-handler';

const handler = protectedResourceHandler({
  authServerUrls: [env('AUTH_KEYCLOAK_ISSUER')!],
});
const corsOptionsHandler = metadataCorsOptionsRequestHandler();

const GET = handler;
const OPTIONS = corsOptionsHandler;

export { GET, OPTIONS };
