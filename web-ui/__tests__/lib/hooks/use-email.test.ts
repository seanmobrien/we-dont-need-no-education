import { renderHook, waitFor } from '@testing-library/react';
import { useEmail, useWriteEmail, emailKeys } from '@/lib/hooks/use-email';
import { getEmail, writeEmailRecord } from '@/lib/api/client';
import { EmailMessage } from '@/data-models';

// Mock the API client functions
jest.mock('@/lib/api/client', () => ({
  getEmail: jest.fn(),
  writeEmailRecord: jest.fn(),
}));

// Mock the logger
jest.mock('@/lib/logger', () => ({
  log: jest.fn(),
}));

// Mock react-util
jest.mock('@/lib/react-util', () => ({
  LoggedError: {
    isTurtlesAllTheWayDownBaby: jest.fn((error) => error),
  },
}));

const mockedGetEmail = getEmail as jest.MockedFunction<typeof getEmail>;
const mockedWriteEmailRecord = writeEmailRecord as jest.MockedFunction<typeof writeEmailRecord>;

describe('useEmail hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch email data successfully', async () => {
    const mockEmail: EmailMessage = {
      emailId: '123',
      subject: 'Test Email',
      body: 'Test body',
      sender: { contactId: 1, name: 'Test Sender', email: 'test@example.com' },
      recipients: [],
      sentOn: new Date(),
      threadId: null,
      parentEmailId: null,
    };

    const mockPromise = Promise.resolve(mockEmail);
    Object.assign(mockPromise, { cancel: jest.fn() });
    mockedGetEmail.mockReturnValue(mockPromise as any);

    const { result } = renderHook(() => useEmail('123'));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockEmail);
    expect(mockedGetEmail).toHaveBeenCalledWith('123');
  });

  it('should not fetch when emailId is null', () => {
    const { result } = renderHook(() => useEmail(null));

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(mockedGetEmail).not.toHaveBeenCalled();
  });

  it('should handle errors properly', async () => {
    const mockError = new Error('Failed to fetch email');
    const mockPromise = Promise.reject(mockError);
    Object.assign(mockPromise, { cancel: jest.fn() });
    mockedGetEmail.mockReturnValue(mockPromise as any);

    const { result } = renderHook(() => useEmail('123'));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it('should generate correct query keys', () => {
    expect(emailKeys.email('123')).toEqual(['email', 'detail', '123']);
    expect(emailKeys.all).toEqual(['email']);
    expect(emailKeys.stats()).toEqual(['email', 'stats']);
  });
});

describe('useWriteEmail hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should write email data successfully', async () => {
    const mockEmail: EmailMessage = {
      emailId: '123',
      subject: 'Test Email',
      body: 'Test body',
      sender: { contactId: 1, name: 'Test Sender', email: 'test@example.com' },
      recipients: [],
      sentOn: new Date(),
      threadId: null,
      parentEmailId: null,
    };

    const mockPromise = Promise.resolve(mockEmail);
    Object.assign(mockPromise, { cancel: jest.fn() });
    mockedWriteEmailRecord.mockReturnValue(mockPromise as any);

    const onSuccessSpy = jest.fn();
    const { result } = renderHook(() => useWriteEmail({ onSuccess: onSuccessSpy }));

    const emailData = {
      subject: 'New Email',
      body: 'New body',
      sender: { contactId: 1, name: 'Test Sender', email: 'test@example.com' },
      recipients: [],
      sentOn: new Date().toISOString(),
      threadId: null,
      parentEmailId: null,
    };

    result.current.mutate(emailData);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockedWriteEmailRecord).toHaveBeenCalledWith(emailData);
    expect(onSuccessSpy).toHaveBeenCalledWith(mockEmail);
  });

  it('should handle write errors properly', async () => {
    const mockError = new Error('Failed to write email');
    const mockPromise = Promise.reject(mockError);
    Object.assign(mockPromise, { cancel: jest.fn() });
    mockedWriteEmailRecord.mockReturnValue(mockPromise as any);

    const onErrorSpy = jest.fn();
    const { result } = renderHook(() => useWriteEmail({ onError: onErrorSpy }));

    const emailData = {
      subject: 'New Email',
      body: 'New body',
      sender: { contactId: 1, name: 'Test Sender', email: 'test@example.com' },
      recipients: [],
      sentOn: new Date().toISOString(),
      threadId: null,
      parentEmailId: null,
    };

    result.current.mutate(emailData);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(onErrorSpy).toHaveBeenCalled();
  });
});