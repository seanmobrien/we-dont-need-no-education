import type {
  Session,
  User,
  JWT,
  Adapter,
  AuthConfig,
  NextAuthResult,
  NextAuthHandlers,
} from '@compliance-theater/auth-compat';
import { isSession, isUser, isJWT } from '@compliance-theater/auth-compat';
import { createNextAuth } from '@compliance-theater/auth-compat/runtime';

// Verify narrowed contract types are usable without peer deps installed.
const _config: AuthConfig = {
  session: { strategy: 'jwt', maxAge: 1800 },
};

const _sessionGuard = (x: unknown): x is Session => isSession(x);
const _userGuard = (x: unknown): x is User => isUser(x);
const _jwtGuard = (x: unknown): x is JWT => isJWT(x);

type _AdapterRef = Adapter;
type _NextAuthResultRef = NextAuthResult;
type _NextAuthHandlersRef = NextAuthHandlers;

export { _config, _sessionGuard, _userGuard, _jwtGuard, createNextAuth };
