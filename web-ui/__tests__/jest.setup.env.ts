/*
 Ensure WHATWG web standard globals exist before any test modules are loaded.
 This runs earlier than setupFilesAfterEnv, preventing ReferenceError when
 modules define classes that extend Response at module-evaluation time.
*/

/* eslint-disable @typescript-eslint/no-explicit-any */

(() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const undici: any = require('undici');
    if (undici) {
      if (!globalThis.Response && undici.Response) {
        (globalThis as any).Response = undici.Response;
      }
      if (!globalThis.Request && undici.Request) {
        (globalThis as any).Request = undici.Request;
      }
      if (!globalThis.Headers && undici.Headers) {
        (globalThis as any).Headers = undici.Headers;
      }
      if (!globalThis.fetch && undici.fetch) {
        (globalThis as any).fetch = undici.fetch;
      }
    }
  } catch {
    // undici may be unavailable in some environments; ignore silently
  }

  // If undici wasn't available or didn't provide globals, ensure minimal fallbacks
  // so modules that `extends Response` at module-eval time don't throw.
  // These are intentionally tiny and only cover what our code paths require.
  const g: any = globalThis as any;
  if (typeof g.Headers === 'undefined') {
    class __SimpleHeaders {
      private m = new Map<string, string>();
      constructor(init?: HeadersInit) {
        if (!init) return;
        if (Array.isArray(init)) {
          for (const [k, v] of init)
            this.m.set(String(k).toLowerCase(), String(v));
        } else if (init instanceof Map) {
          for (const [k, v] of (
            init as unknown as Map<string, string>
          ).entries())
            this.m.set(String(k).toLowerCase(), String(v));
        } else if (typeof init === 'object') {
          for (const [k, v] of Object.entries(init as Record<string, string>))
            this.m.set(k.toLowerCase(), String(v));
        }
      }
      get(name: string): string | null {
        return this.m.get(String(name).toLowerCase()) ?? null;
      }
      set(name: string, value: string) {
        this.m.set(String(name).toLowerCase(), String(value));
      }
      has(name: string): boolean {
        return this.m.has(String(name).toLowerCase());
      }
      append(name: string, value: string) {
        this.set(name, value);
      }
    }
    g.Headers = __SimpleHeaders as unknown as typeof Headers;
  }

  if (typeof g.Response === 'undefined') {
    const HeadersCtor = g.Headers;
    class __SimpleResponse {
      // Minimal surface used in tests
      status: number;
      statusText: string;
      headers: InstanceType<typeof HeadersCtor>;
      private __body: any;
      constructor(body?: BodyInit | null, init?: ResponseInit) {
        this.status = init?.status ?? 200;
        this.statusText = (init as ResponseInit)?.statusText ?? '';
        this.headers = new HeadersCtor(init?.headers ?? ({} as HeadersInit));
        this.__body = body ?? '';
      }
      get ok() {
        return this.status >= 200 && this.status < 300;
      }
      async json() {
        const t = await this.text();
        try {
          return JSON.parse(t || '{}');
        } catch {
          return {};
        }
      }
      async text() {
        const b = this.__body;
        if (typeof b === 'string') return b;
        if (b == null) return '';
        try {
          return String(b);
        } catch {
          return '';
        }
      }
    }
    g.Response = __SimpleResponse as unknown as typeof Response;
  }

  if (typeof g.Request === 'undefined') {
    class __SimpleRequest {
      constructor(
        public input: string | URL,
        public init?: RequestInit,
      ) {}
    }
    g.Request = __SimpleRequest as unknown as typeof Request;
  }
})();
