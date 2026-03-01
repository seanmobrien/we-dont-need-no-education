import { IAfterManager, IAppStartupManager } from '../after';
import type {
  IAccessTokenService,
  IAuthSessionService,
  IImpersonationService,
  ITokenExchangeService,
} from '../lib/auth';
import type { IFetchService } from '../lib/fetch';


export interface ServiceCradle extends Record<string | number | symbol, unknown> {
  'fetch-service': IFetchService;
  'auth-session-service': IAuthSessionService;
  'impersonation-service': IImpersonationService;
  'access-token-service': IAccessTokenService;
  'token-exchange-service': ITokenExchangeService;
  'app-startup': IAppStartupManager;
  'after': IAfterManager;
}
