/**
 * @fileoverview Client-side navigation utilities for browser-based routing operations.
 * 
 * This module provides utility functions for client-side navigation that interact
 * directly with the browser's window.location API. These functions are intended
 * for use in React components and client-side code where Next.js router may not
 * be available or when direct browser navigation is preferred.
 * 
 * @module lib/nextjs-util/client-navigate
 * @version 1.0.0
 * @since 2025-01-01
 * @author NoEducation Team
 */

/**
 * Reloads the current page by triggering a full browser refresh.
 * 
 * This function performs a complete page reload, clearing all client-side state
 * and re-initializing the application. Use this when you need to ensure all
 * cached data is cleared and the page is completely refreshed from the server.
 * 
 * @example
 * ```typescript
 * import { clientReload } from '@/lib/nextjs-util/client-navigate';
 * 
 * // Refresh page after critical error
 * const handleCriticalError = () => {
 *   clientReload();
 * };
 * 
 * // Refresh after logout to clear all state
 * const handleLogout = async () => {
 *   await signOut();
 *   clientReload();
 * };
 * ```
 * 
 * @function clientReload
 * @returns {void} This function does not return a value as it triggers a page reload
 * 
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Location/reload | MDN: Location.reload()}
 * @since 1.0.0
 */
export const clientReload = () => {
  if (
    typeof window !== 'undefined' &&
    window.location &&
    window.location.reload
  ) {
    window.location.reload();
  }
};

/**
 * Navigates to a specified URL using browser's native navigation.
 * 
 * This function performs a full page navigation to the specified URL, similar
 * to clicking a link or typing a URL in the address bar. Unlike Next.js router
 * navigation, this will cause a complete page load and lose client-side state.
 * 
 * Use this function when:
 * - Navigating to external URLs
 * - Performing redirects that require full page reloads
 * - Working outside of Next.js routing context
 * - Ensuring complete state reset during navigation
 * 
 * @example
 * ```typescript
 * import { clientNavigate } from '@/lib/nextjs-util/client-navigate';
 * 
 * // Navigate to external site
 * const handleExternalLink = () => {
 *   clientNavigate('https://external-site.com');
 * };
 * 
 * // Navigate to internal page with full reload
 * const handleFullPageRedirect = () => {
 *   clientNavigate('/dashboard');
 * };
 * 
 * // Navigate with query parameters
 * const handleSearchRedirect = (query: string) => {
 *   clientNavigate(`/search?q=${encodeURIComponent(query)}`);
 * };
 * ```
 * 
 * @function clientNavigate
 * @param {string} url - The URL to navigate to. Can be relative or absolute.
 * @returns {void} This function does not return a value as it triggers navigation
 * 
 * @throws {TypeError} If url parameter is not a string
 * 
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Location/href | MDN: Location.href}
 * @see {@link https://nextjs.org/docs/app/api-reference/functions/use-router | Next.js useRouter} - For client-side routing within Next.js
 * @since 1.0.0
 */
export const clientNavigate = (url: string) => {
    if (
      typeof window !== 'undefined' &&
      window.location &&
      window.location.href
    ) {
      window.location.href = url;
    }
};

/**
 * Navigates to the application's sign-in page with a full page reload.
 * 
 * This is a convenience function that navigates to the authentication sign-in
 * route ('/auth/signin') using browser-native navigation. It performs a complete
 * page reload, ensuring all client-side state is cleared before redirecting
 * to the authentication flow.
 * 
 * This function is particularly useful when:
 * - User session has expired and needs to re-authenticate
 * - Redirecting from error states that require authentication
 * - Implementing logout flows that clear all application state
 * - Handling authentication failures in API calls
 * 
 * @example
 * ```typescript
 * import { clientNavigateSignIn } from '@/lib/nextjs-util/client-navigate';
 * 
 * // Redirect after session expiration
 * const handleSessionExpired = () => {
 *   alert('Session expired. Please sign in again.');
 *   clientNavigateSignIn();
 * };
 * 
 * // Redirect after authentication error
 * const handleAuthError = (error: AuthError) => {
 *   if (error.code === 'UNAUTHORIZED') {
 *     clientNavigateSignIn();
 *   }
 * };
 * 
 * // Manual logout with redirect
 * const handleLogout = async () => {
 *   await signOut();
 *   clientNavigateSignIn();
 * };
 * ```
 * 
 * @function clientNavigateSignIn
 * @returns {void} This function does not return a value as it triggers navigation
 * 
 * @see {@link clientNavigate} - The underlying navigation function
 * @see {@link https://nextjs.org/docs/app/building-your-application/authentication | Next.js Authentication} - For authentication patterns
 * @since 1.0.0
 */
export const clientNavigateSignIn = () => clientNavigate('/auth/signin');