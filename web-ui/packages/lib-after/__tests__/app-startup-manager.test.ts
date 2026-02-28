import {
  AppStartup,
  AppStartupManager,
  type AppStartupConfig,
} from '../src/app-startup';
import type { AppStartupState } from '@compliance-theater/types/after';

describe('AppStartupManager', () => {
  const createMockStartup = (state: AppStartupState = 'ready') => {
    return {
      getStateAsync: jest.fn(async () => state),
    } as unknown as AppStartup;
  };

  it('returns startup state from the provided AppStartup instance', async () => {
    const mockStartup = createMockStartup('ready');
    const manager = new AppStartupManager({}, mockStartup);

    await expect(manager.getStartupState()).resolves.toBe('ready');
    expect(mockStartup.getStateAsync).toHaveBeenCalledTimes(1);
  });

  it('registers a callback accessor that resolves startup state', async () => {
    const mockStartup = createMockStartup('initializing');
    const manager = new AppStartupManager({}, mockStartup);
    const registerAccessor = jest.fn();

    manager.registerStartupAccessorCallback(registerAccessor);

    expect(registerAccessor).toHaveBeenCalledTimes(1);
    const accessor = registerAccessor.mock.calls[0][0] as () => Promise<AppStartupState>;
    await expect(accessor()).resolves.toBe('initializing');
    expect(mockStartup.getStateAsync).toHaveBeenCalledTimes(1);
  });

  it('creates an AppStartup via AppStartup.createInstance when not provided', async () => {
    const mockStartup = createMockStartup('done');
    const config: AppStartupConfig = {
      singletonKey: '@test/app-startup-manager',
    };
    const createInstanceSpy = jest
      .spyOn(AppStartup, 'createInstance')
      .mockReturnValue(mockStartup);
    const manager = new AppStartupManager(config);

    await expect(manager.getStartupState()).resolves.toBe('done');

    expect(createInstanceSpy).toHaveBeenCalledWith(config);
    expect(mockStartup.getStateAsync).toHaveBeenCalledTimes(1);
  });
});
