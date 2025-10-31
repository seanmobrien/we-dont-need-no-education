import { flagsmithServer } from './server';
import { LoggedError } from '@/lib/react-util';

type FetchConfig = {
  fetch_concurrency?: number;
  fetch_stream_detect_buffer?: number;
  fetch_stream_buffer_max?: number;
  fetch_cache_ttl?: number;
  enhanced?: boolean;
  trace_level?: string;
  stream_enabled?: boolean;
  fetch_stream_max_chunks?: number;
  fetch_stream_max_total_bytes?: number;
};

const DEFAULTS: Required<FetchConfig> = {
  fetch_concurrency: 8,
  fetch_stream_detect_buffer: 4 * 1024,
  fetch_stream_buffer_max: 64 * 1024,
  fetch_cache_ttl: 300,
  enhanced: true,
  trace_level: 'warn',
  stream_enabled: true,
  fetch_stream_max_chunks: 1024,
  fetch_stream_max_total_bytes: 1024 * 1024, // 1MB
};

const CACHE_KEY = Symbol.for('@noeducation/flagsmith-fetch-config');

type GlobalReg = { [k: symbol]: Required<FetchConfig> | undefined };

export const fetchConfig = async () => {
  type GlobalReg = { [k: symbol]: Required<FetchConfig> | undefined };
  const globalRegistry = globalThis as unknown as GlobalReg;
  if (globalRegistry[CACHE_KEY]) return globalRegistry[CACHE_KEY]!;
  try {
    const server = await flagsmithServer();
    const raw = await server.getAllFlags();
    const extractNum = (v: unknown): number | undefined => {
      if (v == null) return undefined;
      if (typeof v === 'number') return v;
      if (typeof v === 'string') {
        const parsed = Number(v);
        return Number.isFinite(parsed) ? parsed : undefined;
      }
      try {
        // may be an object like { max: 65536, detect: 4096 } or a Flagsmith JSON wrapper
        const obj = v as Record<string, unknown> | undefined;
        if (obj && typeof obj === 'object') {
          if (typeof obj.detect === 'number') return obj.detect as number;
          if (typeof obj.max === 'number') return obj.max as number;
          const val = obj.value as Record<string, unknown> | undefined;
          if (val && typeof val === 'object') {
            if (typeof val.detect === 'number') return val.detect as number;
            if (typeof val.max === 'number') return val.max as number;
          }
        }
      } catch {
        /* ignore */
      }
      return undefined;
    };

    const v: Required<FetchConfig> = {
      fetch_concurrency:
        Number(raw.models_fetch_concurrency) || DEFAULTS.fetch_concurrency,
      fetch_stream_detect_buffer:
        extractNum(raw.models_fetch_stream_buffer) ??
        DEFAULTS.fetch_stream_detect_buffer,
      fetch_stream_buffer_max:
        extractNum(raw.models_fetch_stream_buffer) ??
        DEFAULTS.fetch_stream_buffer_max,
      fetch_cache_ttl:
        Number(raw.models_fetch_cache_ttl) || DEFAULTS.fetch_cache_ttl,
      enhanced:
        typeof raw.models_fetch_enhanced === 'boolean'
          ? raw.models_fetch_enhanced
          : Boolean(raw.models_fetch_enhanced ?? DEFAULTS.enhanced),
      trace_level: String(raw.models_fetch_trace_level ?? DEFAULTS.trace_level),
      stream_enabled:
        typeof raw.models_fetch_stream_buffer === 'object' &&
        raw.models_fetch_stream_buffer?.enabled === true
          ? true
          : Boolean(raw.models_fetch_stream_buffer?.enabled ?? true),
      fetch_stream_max_chunks:
        Number(
          (raw as Record<string, unknown>).models_fetch_stream_max_chunks,
        ) || DEFAULTS.fetch_stream_max_chunks,
      fetch_stream_max_total_bytes:
        Number(
          (raw as Record<string, unknown>).models_fetch_stream_max_total_bytes,
        ) || DEFAULTS.fetch_stream_max_total_bytes,
    };
    globalRegistry[CACHE_KEY] = v;
    // best-effort refresh in background periodically
    setInterval(
      async () => {
        try {
          const srv = await flagsmithServer();
          const r = await srv.getAllFlags();
          const rr = r as unknown as Record<string, unknown>;
          const extractNum2 = (v: unknown): number | undefined => {
            if (v == null) return undefined;
            if (typeof v === 'number') return v;
            if (typeof v === 'string') {
              const parsed = Number(v);
              return Number.isFinite(parsed) ? parsed : undefined;
            }
            try {
              const obj = v as Record<string, unknown> | undefined;
              if (!obj || typeof obj !== 'object') return undefined;
              if (typeof obj.detect === 'number') return obj.detect as number;
              if (typeof obj.max === 'number') return obj.max as number;
              const val = obj.value as Record<string, unknown> | undefined;
              if (val && typeof val.detect === 'number')
                return val.detect as number;
              if (val && typeof val.max === 'number') return val.max as number;
            } catch {}
            return undefined;
          };
          globalRegistry[CACHE_KEY] = {
            fetch_concurrency:
              Number(rr.models_fetch_concurrency) || DEFAULTS.fetch_concurrency,
            fetch_stream_detect_buffer:
              extractNum2(rr.models_fetch_stream_buffer) ??
              DEFAULTS.fetch_stream_detect_buffer,
            fetch_stream_buffer_max:
              extractNum2(rr.models_fetch_stream_buffer) ??
              DEFAULTS.fetch_stream_buffer_max,
            fetch_cache_ttl:
              Number(rr.models_fetch_cache_ttl) || DEFAULTS.fetch_cache_ttl,
            enhanced:
              typeof rr.models_fetch_enhanced === 'boolean'
                ? (rr.models_fetch_enhanced as boolean)
                : Boolean(rr.models_fetch_enhanced ?? DEFAULTS.enhanced),
            trace_level: String(
              rr.models_fetch_trace_level ?? DEFAULTS.trace_level,
            ),
            stream_enabled: (() => {
              const buf = rr.models_fetch_stream_buffer as unknown;
              if (buf && typeof buf === 'object') {
                const b = buf as Record<string, unknown>;
                if (b.enabled === true) return true;
                if (typeof b.enabled === 'boolean') return Boolean(b.enabled);
              }
              return Boolean(
                (rr as Record<string, unknown>)?.models_fetch_stream_buffer ??
                  true,
              );
            })(),
            fetch_stream_max_chunks:
              Number(
                (rr as Record<string, unknown>).models_fetch_stream_max_chunks,
              ) || DEFAULTS.fetch_stream_max_chunks,
            fetch_stream_max_total_bytes:
              Number(
                (rr as Record<string, unknown>)
                  .models_fetch_stream_max_total_bytes,
              ) || DEFAULTS.fetch_stream_max_total_bytes,
          };
        } catch (e) {
          LoggedError.isTurtlesAllTheWayDownBaby(e, {
            source: 'flagsmith:fetch-config',
            log: true,
          });
        }
      },
      1000 * 60 * 5,
    );
    return v;
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      source: 'flagsmith:fetch-config',
      log: true,
    });
    return DEFAULTS;
  }
};

export const fetchConfigSync = (): Required<FetchConfig> => {
  const globalRegistry = globalThis as unknown as GlobalReg;
  return globalRegistry[CACHE_KEY] ?? DEFAULTS;
};

export default fetchConfig;
