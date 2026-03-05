import { ISingletonProvider } from 'src/lib/logger/singleton-provider';
import { IAfterManager, IAppStartupManager } from '../after';
import type {
  IAccessTokenService,
  IAuthSessionService,
  IImpersonationService,
  ITokenExchangeService,
} from '../lib/auth';
import type { IFetchService } from '../lib/fetch';


export interface ServiceCradle extends Record<string | number | symbol, unknown> {
  fetch: IFetchService;
  session: IAuthSessionService;
  impersonation: IImpersonationService;
  accessTokens: IAccessTokenService;
  exchangeTokens: ITokenExchangeService;
  startup: IAppStartupManager;
  after: IAfterManager;
  singleton: ISingletonProvider;
}
