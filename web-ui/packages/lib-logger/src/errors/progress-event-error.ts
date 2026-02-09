import { SafeProgressEvent, isProgressEvent } from '../utilities/error-guards';
import { ErrorContext, IContextEnricher } from '../types';

export class ProgressEventError<
    TEventTarget extends EventTarget = XMLHttpRequest,
  >
  implements Error, IContextEnricher
{
  name: string;
  message: string;
  lengthComputable: boolean;
  loaded: number;
  total: number;
  cause: { source: EventTarget | null };
  #source: SafeProgressEvent<TEventTarget>;
  #headers: Record<string, string> | undefined;

  constructor(event: SafeProgressEvent<TEventTarget>) {
    if (!event || !isProgressEvent(event)) {
      throw new TypeError(
        'ProgressEventError requires a ProgressEvent as its source.',
      );
    }
    this.name = 'ProgressEventError';
    this.message = 'An API request progress event error has occurred.';
    this.lengthComputable = event.lengthComputable;
    this.loaded = event.loaded;
    this.total = event.total;
    this.#source = event;
    this.cause = { source: event.target };
  }

  get source(): SafeProgressEvent<TEventTarget> {
    return this.#source;
  }
  get headers(): Record<string, string> | undefined {
    // If we already parsed headers, return them
    if (this.#headers) {
      return this.#headers;
    }
    // Otherwise, try to extract from XHR if possible
    if (
      !this.#source ||
      !this.#source.target ||
      !(this.#source.target instanceof XMLHttpRequest)
    ) {
      return undefined;
    }
    // Then try to extract headers from the XHR's custom _ajaxData property
    const xhr = this.#source.target as XMLHttpRequest;
    if (
      '_ajaxData' in xhr &&
      typeof xhr._ajaxData === 'object' &&
      xhr._ajaxData &&
      'xh' in xhr._ajaxData &&
      Array.isArray(xhr._ajaxData.xh)
    ) {
      this.#headers = xhr._ajaxData.xh.reduce(
        (
          acc: Record<string, string>,
          { n: key, v: value }: { n: string; v: string },
        ) => {
          acc[key] = value;
          return acc;
        },
        {},
      );
    }
    // Cache and return whatever we found (or undefined)
    return this.#headers;
  }

  async enrichContext(context: ErrorContext): Promise<ErrorContext> {
    // Provide additional context based on the progress event and any parsed headers.
    const enriched: ErrorContext = {
      ...context,
      timestamp: context.timestamp ?? new Date(),
    };

    try {
      const hdrs = this.headers;
      if (hdrs) {
        enriched.additionalData = {
          ...(enriched.additionalData ?? {}),
          xhrHeaders: hdrs,
        };
      }

      if (this.cause && this.cause.source) {
        // Try to capture a URL when the source is an XHR-like object
        const src = this.cause.source as unknown as
          | { responseURL?: string }
          | undefined;
        if (!enriched.url && src && typeof src.responseURL === 'string') {
          enriched.url = src.responseURL;
        }
      }
    } catch {
      // Best-effort enrichment; do not throw from enrichment.
    }

    return enriched;
  }
}
