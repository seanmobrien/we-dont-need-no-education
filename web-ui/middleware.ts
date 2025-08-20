export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|auth/|api/chat/rate-retry|logo-(?:dark|light)).*)',
  ],
};
export { auth as middleware } from '@/auth';
