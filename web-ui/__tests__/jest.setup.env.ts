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
})();
