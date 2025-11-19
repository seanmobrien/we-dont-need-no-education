/**
 * Module: @/lib/react-util/ClientWrapper
 * Type declarations for the light-weight client wrapper component.
 *
 * This declaration file provides a small, well-documented API surface for
 * the `ClientWrapper` component implemented in `ClientWrapper.tsx`.
 *
 * The component is intentionally minimal: it creates a client boundary and
 * renders its `children` without adding extra DOM nodes. The runtime file is
 * marked with `"use client"` and therefore must be used from client-side
 * contexts in Next.js app routes.
 */

declare module '@/lib/react-util/ClientWrapper' {
  import type { PropsWithChildren, ReactElement } from 'react';

  /**
   * Props for `ClientWrapper`.
   *
   * The wrapper accepts an arbitrary props object but only consumes `children`.
   * Accepting `object` allows callers to pass shape-compatible props without
   * TypeScript errors; the implementation intentionally ignores additional
   * properties to remain a transparent boundary.
   */
  export type ClientWrapperProps = PropsWithChildren<object>;

  /**
   * ClientWrapper
   *
   * A minimal client-side React component whose only responsibility is to
   * establish a client boundary and render `children` as-is. This is useful
   * in Next.js app router layouts where a small, explicit client wrapper is
   * required to host client-only components or hooks while keeping markup
   * minimal.
   *
   * Behavior guarantees:
   * - Renders children without adding wrapper DOM nodes.
   * - Is a pure presentational wrapper; it does not mutate children or side-
   *   effect external state.
   *
   * Usage example:
   * ```tsx
   * import { ClientWrapper } from '@/lib/react-util/ClientWrapper';
   *
   * export default function MyPage() {
   *   return (
   *     <ClientWrapper>
   *       <SomeClientOnlyComponent />
   *     </ClientWrapper>
   *   );
   * }
   * ```
   *
   * @param props - Props including `children` to render.
   * @returns A React element containing the provided children.
   */
  export function ClientWrapper(props: ClientWrapperProps): ReactElement;
}
