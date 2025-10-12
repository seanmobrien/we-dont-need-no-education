/* eslint-disable @typescript-eslint/no-explicit-any */
import { screen, render, renderHook, waitFor, act } from '../../test-utils';
import { useEmail, useWriteEmail, emailKeys } from '@/lib/hooks/use-email';
import { getEmail, writeEmailRecord } from '@/lib/api/client';
import { EmailMessage } from '@/data-models';
import { UseMutateFunction } from '@tanstack/react-query';

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
const mockedWriteEmailRecord = writeEmailRecord as jest.MockedFunction<
  typeof writeEmailRecord
>;

const TIMEOUT = 15000;

const ErrorTestComponent = ({
  triggerError,
}: {
  triggerError: () => { isError: boolean };
}) => {
  const { isError } = triggerError();

  return (
    <div>
      {isError && <span data-test-id="error-message">Error occurred</span>}
    </div>
  );
};

describe('useEmailQuery hooks', () => {
  describe('useEmail hook', () => {
    beforeEach(() => {
      // jest.clearAllMocks();
    });

    it(
      'should fetch email data successfully',
      async () => {
        const mockEmail: EmailMessage = {
          emailId: '123',
          subject: 'Test Email',
          body: 'Test body',
          sender: {
            contactId: 1,
            name: 'Test Sender',
            email: 'test@example.com',
          },
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
      },
      TIMEOUT,
    );

    it(
      'should not fetch when emailId is null',
      () => {
        const { result } = renderHook(() => useEmail(null));

        expect(result.current.data).toBeUndefined();
        expect(result.current.isLoading).toBe(false);
        expect(mockedGetEmail).not.toHaveBeenCalled();
      },
      TIMEOUT,
    );

    it(
      'should handle errors properly',
      async () => {
        const mockError = new Error('Failed to fetch email');
        // Mock the getEmail function to reject with error
        mockedGetEmail.mockImplementation(() => {
          const promise = Promise.reject(mockError);
          Object.assign(promise, { cancel: jest.fn() });
          return promise as any;
        });

        render(
          <ErrorTestComponent
            triggerError={() => useEmail('123', { enabled: true })}
          />,
        );
        await waitFor(
          async () =>
            expect(screen.getByText('Error occurred')).toBeInTheDocument(),
          { timeout: TIMEOUT - 1000 },
        );
      },
      TIMEOUT,
    );

    it(
      'should generate correct query keys',
      () => {
        expect(emailKeys.email('123')).toEqual(['email', 'detail', '123']);
        expect(emailKeys.all).toEqual(['email']);
        expect(emailKeys.stats()).toEqual(['email', 'stats']);
      },
      TIMEOUT,
    );
  });

  describe('useWriteEmail hook', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it(
      'should write email data successfully',
      async () => {
        const mockEmail: EmailMessage = {
          emailId: '123',
          subject: 'Test Email',
          body: 'Test body',
          sender: {
            contactId: 1,
            name: 'Test Sender',
            email: 'test@example.com',
          },
          recipients: [],
          sentOn: new Date(),
          threadId: null,
          parentEmailId: null,
        };

        const mockPromise = Promise.resolve(mockEmail);
        Object.assign(mockPromise, { cancel: jest.fn() });
        mockedWriteEmailRecord.mockReturnValue(mockPromise as any);

        const onSuccessSpy = jest.fn();
        const { result } = renderHook(() =>
          useWriteEmail({ onSuccess: onSuccessSpy }),
        );

        const emailData = {
          subject: 'New Email',
          body: 'New body',
          sender: {
            contactId: 1,
            name: 'Test Sender',
            email: 'test@example.com',
          },
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
      },
      TIMEOUT,
    );

    it(
      'should handle write errors properly',
      async () => {
        const mockError = new Error('Failed to write email');
        // Mock the writeEmailRecord function to reject with error
        mockedWriteEmailRecord.mockImplementation(() => {
          const promise = Promise.reject(mockError);
          Object.assign(promise, { cancel: jest.fn() });
          return promise as any;
        });

        const onErrorSpy = jest.fn();
        let doMutate:
          | UseMutateFunction<
              EmailMessage,
              Error,
              Omit<EmailMessage, 'emailId'> &
                Partial<Pick<EmailMessage, 'emailId'>>,
              unknown
            >
          | undefined = undefined;
        const useHookMutate = () => {
          const res = useWriteEmail({ onError: onErrorSpy });
          doMutate = res.mutate;
          return res;
        };

        render(<ErrorTestComponent triggerError={useHookMutate} />);

        const emailData = {
          subject: 'New Email',
          body: 'New body',
          sender: {
            contactId: 1,
            name: 'Test Sender',
            email: 'test@example.com',
          },
          recipients: [],
          sentOn: new Date().toISOString(),
          threadId: null,
          parentEmailId: null,
        };

        await act(async () => {
          if (!doMutate) throw new Error('mutate function not defined');
          doMutate(emailData);
        });
        await waitFor(
          async () =>
            expect(screen.getByText('Error occurred')).toBeInTheDocument(),
          { timeout: TIMEOUT - 1000 },
        );
        expect(onErrorSpy).toHaveBeenCalled();
      },
      TIMEOUT,
    );
  });
});
