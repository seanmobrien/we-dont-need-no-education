import AfterManager, { AfterManagerService } from '../src/index';
import type { IAfterManager, TAfterHandler } from '@compliance-theater/types/after';

describe('AfterManagerService', () => {
  const createMockManager = (): jest.Mocked<IAfterManager> => {
    const queueImpl = ((queueName: string, create?: boolean) => {
      if (create === false) {
        return undefined;
      }
      return [] as Array<TAfterHandler<void>>;
    }) as IAfterManager['queue'];

    return {
      add: jest.fn(() => true),
      remove: jest.fn(() => true),
      queue: jest.fn(queueImpl) as unknown as jest.MockedFunction<
        IAfterManager['queue']
      >,
      signal: jest.fn(async () => undefined),
    };
  };

  it('delegates add/remove/signal to the provided manager', async () => {
    const mockManager = createMockManager();
    const service = new AfterManagerService(mockManager);
    const handler = jest.fn(async () => undefined);

    expect(service.add('teardown', handler)).toBe(true);
    expect(service.remove('teardown', handler)).toBe(true);
    await expect(service.signal('teardown')).resolves.toBeUndefined();

    expect(mockManager.add).toHaveBeenCalledWith('teardown', handler);
    expect(mockManager.remove).toHaveBeenCalledWith('teardown', handler);
    expect(mockManager.signal).toHaveBeenCalledWith('teardown');
  });

  it('delegates queue overload with create=true correctly', () => {
    const mockManager = createMockManager();
    const service = new AfterManagerService(mockManager);

    const queue = service.queue('teardown', true);

    expect(queue).toEqual([]);
    expect(mockManager.queue).toHaveBeenCalledWith('teardown', true);
  });

  it('delegates queue overload with create=false correctly', () => {
    const mockManager = createMockManager();
    const service = new AfterManagerService(mockManager);

    const queue = service.queue('teardown', false);

    expect(queue).toBeUndefined();
    expect(mockManager.queue).toHaveBeenCalledWith('teardown', false);
  });

  it('uses AfterManager singleton when no manager is provided', () => {
    const mockManager = createMockManager();
    const getInstanceSpy = jest
      .spyOn(AfterManager, 'getInstance')
      .mockReturnValue(mockManager as unknown as AfterManager);
    const handler = jest.fn(async () => undefined);

    const service = new AfterManagerService();
    service.add('teardown', handler);

    expect(getInstanceSpy).toHaveBeenCalledTimes(1);
    expect(mockManager.add).toHaveBeenCalledWith('teardown', handler);
  });
});
