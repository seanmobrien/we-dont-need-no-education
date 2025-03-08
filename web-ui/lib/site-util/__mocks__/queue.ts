import Queue, { Job } from 'bee-queue';
import { AttachmentDownloadJob, BaseJob, QueueManager } from '../queue/types';

export type * from '../queue/types';

const onFunction = jest.fn();
const mockAttachmentQueue = {
  process: jest.fn(),
  submit: jest.fn(),
  getJob: jest.fn(),
  on: onFunction,
  off: jest.fn(),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  triggerEvent: (event: string, ...args: any[]) => {
    onFunction.mock.calls.forEach((call) => {
      if (call[0] === event) {
        call[1](...args);
      }
    });
  },
};

type QueueInstanceSettings<
  U extends BaseJob,
  TResult = unknown
> = Partial<Queue.QueueSettings> & {
  processor?: (job: Job<U>) => Promise<TResult>;
};

export const queueManagerFactory: <U extends BaseJob, TResult = unknown>(
  name: string,
  settings: QueueInstanceSettings<U, TResult>
) => Promise<QueueManager<U>> = jest.fn(
  <TU extends BaseJob, TResult = unknown>(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    name: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    settings: QueueInstanceSettings<TU, TResult>
  ) => Promise.resolve(mockAttachmentQueue as unknown as QueueManager<TU>)
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const shutdown: (name: string) => Promise<boolean> =
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  jest.fn((s: string) => Promise.resolve(true));

beforeEach(() => {
  (queueManagerFactory as jest.Mock).mockClear();
  (shutdown as jest.Mock).mockClear();
  Object.keys(mockAttachmentQueue).forEach((aKey) => {
    const theKey = aKey as keyof QueueManager<AttachmentDownloadJob>;
    const target = mockAttachmentQueue[theKey];
    if (
      !!target &&
      'mockClear' in target &&
      typeof target.mockClear === 'function'
    ) {
      target.mockClear();
    }
  });
});
