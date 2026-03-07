import type { AppStartupState } from './app-startup-state';

export type StartupStateAccessor = () => Promise<AppStartupState>;

export type StartupAccessorCallbackRegistration = (
  accessor: StartupStateAccessor,
) => void;

export type IAppStartupManager = {
  getStartupState: StartupStateAccessor;
  registerStartupAccessorCallback: (
    registerAccessor: StartupAccessorCallbackRegistration,
  ) => void;
};
