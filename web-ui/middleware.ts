export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|auth/).*)'],
};
export { auth as middleware } from '@/auth';
