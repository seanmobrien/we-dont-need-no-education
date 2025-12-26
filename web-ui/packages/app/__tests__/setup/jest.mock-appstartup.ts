type AppStartupState = 'pending' | 'initializing' | 'ready' | 'teardown' | 'done';


jest.mock('@/lib/site-util/app-startup', () => {
  const startup = jest.fn(() => {
    if (ret._currentState === 'pending' || ret._currentState === 'initializing') {
      ret._currentState = 'ready';
    }
    return Promise.resolve(ret._currentState);
  });
  const state = jest.fn(() => ret._currentState);
  const ret = ({
    _currentState: 'pending',
    startup,
    state,
  }) as {
    _currentState: AppStartupState;
    startup: () => Promise<AppStartupState>;
    state: () => AppStartupState;
  };
  return ret;
});
// Import to ensure mock is sticky
import { startup } from '@/lib/site-util/app-startup';
