export const config = {
  matcher: [
    '/((?!api/auth/|api/health(?!/tools)|\\.well-known/|api/chat/rate-retry|_next/static|_next/image|static|auth(?:/|$)|privacy|terms|favicon\\.ico|(?:4|5)\\d{2}).*)',
  ],
};

export { auth as middleware } from '@/auth';
