import { wrapRouteRequest, fetch } from '@/lib/nextjs-util/server';
import { env } from '@/lib/site-util/env';
import { NextResponse } from 'next/dist/server/web/spec-extension/response';

export const GET = wrapRouteRequest(async () => {
  const mem0_api_host = env('MEM0_API_HOST');
  // Use await to ensure any fetch errors are caught within this function and
  // propogated up to wrapRouteRequest for handling.
  return await fetch(new URL('openapi.json', mem0_api_host).toString(), {
    timeout: {
      connect: 90 * 1000,
      socket: 60 * 1000,
    },
  }).then(async (res) => {
    const text = await res.text();
    return NextResponse.json(
      JSON.parse(text, (key, value) => {
        switch (key) {
          case 'url':
            return typeof value === 'string' && !!value
              ? value.replaceAll(mem0_api_host, env('NEXT_PUBLIC_HOSTNAME'))
              : value;
          case 'paths':
            if (value && typeof value === 'object') {
              const newPaths: Record<string, unknown> = {};
              for (const [path, methods] of Object.entries(value)) {
                if (!path.startsWith('/mcp/')) {
                  newPaths[path.replace('api/v1/', 'api/memory/')] = methods;
                }
              }
              return newPaths;
            }
            return value;
        }
        return value;
      }),
    );
  });
});
