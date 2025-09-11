export const config = {
  matcher: [
    '/((?!(?:api/auth|api/health|_next/static|_next/image|static/.*|favicon.ico|auth/|api/chat/rate-retry$|logo-(?:dark|light)).*))',
  ],
};
export { auth as middleware } from '@/auth';
