import { LoggedError } from '@/lib/react-util/client';
import { fromRequest } from '@/lib/auth/impersonation/impersonation-factory';

export const GET = async () => {
  try {
    const impersonationService = await fromRequest({});
    if (!impersonationService) {
      return new Response('Unauthorized', { status: 401 });
    }
    const token = await impersonationService.getImpersonatedToken();
    if (!token) {
      return new Response('No Token', { status: 403 });
    }
    // You can now use impersonationService to perform actions
    return new Response('Success', { status: 200 });
  } catch (error) {
    const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
      source: 'app/api/auth/test/route',
      log: true,
      tags: { feature: 'impersonation-test' },
    });
    return new Response('Error', {
      status: 500,
      statusText: le.message,
    });
  }
};
