export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|auth/|api/ai).*)',
  ],
  runtime: 'nodejs',
};
export { auth as middleware } from '@/auth';
