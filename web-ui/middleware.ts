export const config = {
  matcher: [
    '/((?!api/auth/|api/health|api/chat/rate-retry|_next/static|_next/image|static|auth(?:/|$)|privacy|terms|favicon\\.ico).*)',
  ],
};

export { auth as middleware } from '@/auth';
