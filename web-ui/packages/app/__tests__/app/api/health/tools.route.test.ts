/**
 * @jest-environment node
 */

jest.mock('../../../../lib/api/health/chat', () => ({
  checkChatHealth: jest.fn(),
}));

jest.mock('@compliance-theater/auth/auth.node', () => ({
  auth: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '../../../../app/api/health/tools/route';
import { auth } from '@compliance-theater/auth/auth.node';
import { checkChatHealth } from '../../../../lib/api/health/chat';

describe('/api/health/tools route', () => {
  beforeEach(() => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'test-user' } });
    (checkChatHealth as jest.Mock).mockResolvedValue({
      status: 'warning',
      cache: { status: 'healthy' },
      queue: { status: 'healthy' },
      tools: { status: 'warning' },
    });
  });

  afterEach(() => {
    (auth as jest.Mock).mockReset();
    (checkChatHealth as jest.Mock).mockReset();
  });

  it('returns a structured tools health response for authenticated requests', async () => {
    const request = new NextRequest('http://localhost/api/health/tools');

    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(checkChatHealth).toHaveBeenCalledWith();
    expect(json).toEqual({
      status: 'warning',
      cache: { status: 'healthy' },
      queue: { status: 'healthy' },
      tools: { status: 'warning' },
    });
  });

  it('returns 401 when the user is not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValueOnce(null);
    const request = new NextRequest('http://localhost/api/health/tools');

    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(checkChatHealth).not.toHaveBeenCalled();
    expect(json).toEqual({ status: 401, message: 'Unauthorized' });
  });
});