import type { ISingletonProvider } from '../lib/logger/singleton-provider';
import type { IAfterManager, IAppStartupManager } from '../after';
import type {
  IAccessTokenService,
  IAuthSessionService,
  IImpersonationService,
  ITokenExchangeService,
  IUserSigningKeysService,
} from '../lib/auth';
import type { IFetchService } from '../lib/fetch';

export interface ServiceCradle extends Record<string | number | symbol, unknown> {
  fetch: IFetchService;
  session: IAuthSessionService;
  impersonation: IImpersonationService;
  accessTokens: IAccessTokenService;
  exchangeTokens: ITokenExchangeService;
  userSigningKeys: IUserSigningKeysService;
  startup: IAppStartupManager;
  after: IAfterManager;
  singleton: ISingletonProvider;
}
