import { mockDeep } from 'jest-mock-extended';
import { google } from 'googleapis';

const mockGoogle = mockDeep<typeof google>();

mockGoogle.gmail.mockReturnValue({
  users: {
    messages: {},
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);

export { mockGoogle as google };
