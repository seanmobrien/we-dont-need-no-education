import { LoggedError } from '/lib/react-util/client';
import { fromRequest } from '/lib/auth/impersonation/impersonation-factory';

export const GET = async () => {
  try {
    const impersonationService = await fromRequest({});
    if (!impersonationService) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = await impersonationService.getImpersonatedToken();
    if (!token) {
      return Response.json({ error: 'No Token' }, { status: 403 });
    }
    // You can now use impersonationService to perform actions
    return Response.json({ success: true, token }, { status: 200 });
  } catch (error) {
    const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
      source: 'app/api/auth/test/route',
      log: true,
      tags: { feature: 'impersonation-test' },
    });
    return Response.json({ error: le.message }, { status: 500 });
  }
};
