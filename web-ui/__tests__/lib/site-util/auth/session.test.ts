import { query, queryExt } from '@/lib/neondb';
import { log } from '@/lib/logger';
import { Session } from 'next-auth';
import { SessionExt } from '@/lib/site-util/auth/_types';

jest.mock('@/lib/neondb');
jest.mock('@/lib/logger');

describe('ServerSession', () => {
  const sessionId = 1;
  let serverSession: ServerSession;

  beforeEach(() => {
    (query as jest.Mock).mockImplementation(() => Promise.resolve([]));
    (queryExt as jest.Mock).mockImplementation(() =>
      Promise.resolve({ rowCount: 0, rows: [] }),
    );
    serverSession = new ServerSession(sessionId);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('resolveTokens', () => {
    it('should load tokens from the data store', async () => {
      const mockRecord = { gmail: 'token', refresh: 'refreshToken' };
      (query as jest.Mock).mockResolvedValueOnce([mockRecord]);

      const tokens = await serverSession.resolveTokens();

      expect(tokens).toEqual(mockRecord);
      expect(query).toHaveBeenCalledTimes(1);
    });
  });

  describe('flush', () => {
    it('should save tokens if dirty', async () => {
      serverSession.tokens.setGmail('newToken');
      (queryExt as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });

      await serverSession.flush();

      expect(queryExt).toHaveBeenCalledTimes(1);
    });

    it('should not save tokens if not dirty', async () => {
      await serverSession.flush();

      expect(queryExt).not.toHaveBeenCalled();
    });

    it('should log a warning if save fails', async () => {
      serverSession.tokens.setGmail('newToken');
      (queryExt as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });

      await serverSession.flush();

      expect(log).toHaveBeenCalledWith(expect.any(Function));
    });
  });
});

describe('ServerSessionTokens', () => {
  const sessionId = 1;
  let serverSessionTokens: ServerSession['tokens'];

  beforeEach(() => {
    serverSessionTokens = new ServerSession(sessionId).tokens;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('resolve', () => {
    it('should resolve tokens from the data store', async () => {
      const mockRecord = { gmail: 'token', refresh: 'refreshToken' };
      (query as jest.Mock).mockResolvedValueOnce([mockRecord]);

      const tokens = await serverSessionTokens.load();

      expect(tokens).toEqual(mockRecord);
      expect(query).toHaveBeenCalledTimes(1);
    });
  });

  describe('save', () => {
    it('should save tokens if dirty', async () => {
      serverSessionTokens.setGmail('newToken');
      (queryExt as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });

      const result = await serverSessionTokens.save();

      expect(result).toBe(true);
      expect(queryExt).toHaveBeenCalledTimes(1);
    });

    it('should not save tokens if not dirty', async () => {
      const result = await serverSessionTokens.save();

      expect(result).toBe(false);
      expect(queryExt).not.toHaveBeenCalled();
    });
  });
});

describe('serverSessionFactory', () => {
  it('should create a ServerSession and attach it to the session', () => {
    const session = { id: 1 } as Session;
    const serverSession = serverSessionFactory(session);

    expect(serverSession).toBeInstanceOf(ServerSession);
    expect((session as Partial<SessionExt>).server).toBe(serverSession);
  });

  it('should create a ServerSession without attaching it to the session', () => {
    const session = { id: 1 } as Session;
    const serverSession = serverSessionFactory(session, false);

    expect(serverSession).toBeInstanceOf(ServerSession);
    expect((session as Partial<SessionExt>).server).toBeUndefined();
  });
});
