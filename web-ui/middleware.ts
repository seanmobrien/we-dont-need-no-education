export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|auth/).*)'],
  runtime: 'nodejs',
};
export { auth as middleware } from '@/auth';
