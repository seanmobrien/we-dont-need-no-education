/**
 * Utilities for wrapping ProgressEvent objects into a typed Error-like
 * structure suitable for throwing and programmatic inspection.
 *
 * The primary export is {@link ProgressEventError} which captures the
 * common fields exposed by XHR/Progress events (loaded/total/lengthComputable)
 * and provides access to the original event via the `.source` getter. The
 * `.headers` getter attempts to extract headers from legacy XHR internal
 * structures when available and caches the result.
 *
 * Consumers can construct a ProgressEventError with a ProgressEvent whose
 * `target` is typically an `XMLHttpRequest`. If an invalid value is passed,
 * the constructor will throw a `TypeError`.
 */

declare module 'lib/react-util/errors/progress-event-error' {
  /**
   * A structured error wrapper around a DOM ProgressEvent, designed to be
   * thrown or returned by network utilities that observe XHR progress events.
   *
   * @typeParam TEventTarget - The specific EventTarget subtype used by the
   * ProgressEvent (defaults to `XMLHttpRequest`). This narrows the `.source`
   * property's target when consumers need access to XHR-specific fields.
   */
  export class ProgressEventError<
    TEventTarget extends EventTarget = XMLHttpRequest,
  > implements Error
  {
    /** The standard error name. */
    name: string;

    /** Short human-readable message describing the error. */
    message: string;

    /** Whether the underlying ProgressEvent reported a computable length. */
    lengthComputable: boolean;

    /** Bytes loaded so far as reported by the ProgressEvent. */
    loaded: number;

    /** Total bytes expected as reported by the ProgressEvent. */
    total: number;

    /** Ancillary error cause carrying the original event target when available. */
    cause: {
      source: EventTarget | null;
    };

    /**
     * Create a new ProgressEventError from a ProgressEvent. The constructor
     * validates that the provided value is a ProgressEvent and will throw a
     * `TypeError` if not.
     *
     * @param event - The ProgressEvent instance to wrap (required).
     */
    constructor(event: ProgressEvent<TEventTarget>);

    /**
     * The original ProgressEvent provided to the constructor.
     * This property is readonly and strongly typed to the event's target.
     */
    get source(): ProgressEvent<TEventTarget>;

    /**
     * An optional convenience getter that attempts to extract HTTP-style
     * headers from legacy/embedded XHR structures (for example the
     * `_ajaxData.xh` array used by some libraries). The return value is
     * either a plain object mapping header names to values or `undefined` when
     * headers could not be discovered.
     *
     * The value is lazily computed on first access and then cached on the
     * instance for subsequent reads.
     */
    get headers(): Record<string, string> | undefined;
  }
}
