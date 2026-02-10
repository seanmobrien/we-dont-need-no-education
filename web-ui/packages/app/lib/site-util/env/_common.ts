import { isTruthy } from '@/lib/react-util/utility-methods';
import { LoggedError } from '@compliance-theater/logger';
import z from 'zod';
import { isAiModelType } from '@/lib/ai/core/guards';
import { AiModelType, AiModelTypeValues } from '@/lib/ai/core/unions';

export type RuntimeConfig = 'nodejs' | 'edge' | 'client' | 'static' | 'server';
const currentRuntime: RuntimeConfig = (() => {
  if (typeof window !== 'undefined') {
    // Client-side detection
    if ('Deno' in window || 
        (typeof process !== 'undefined' && 
         typeof process.env === 'object' && 
         process.env.NEXT_RUNTIME === 'edge')) {
      return 'edge';
    } else if ('process' in window) {
      return 'nodejs';
    }
    return 'client';
  } else {
    // Server-side detection
    if (typeof process !== 'undefined' && typeof process.env === 'object') {
      if (process.env.NEXT_RUNTIME === 'edge') {
        return 'edge';
      }
      return 'nodejs';
    }
    return 'server';
  }
})();

export const runtime = (): RuntimeConfig => currentRuntime;

export const isRunningOnServer = (): boolean => {
  if (typeof window !== 'undefined') {
    return false;
  }
  return currentRuntime !== 'client' && 
         typeof process !== 'undefined' && 
         typeof process.env === 'object' && 
         (!!process.env.AUTH_SECRET || currentRuntime === 'nodejs');
};

export const isRunningOnClient = (): boolean => {
  if (typeof window !== 'undefined') {
    return true;
  }
  return currentRuntime === 'client';
};

export const isRunningOnEdge = (): boolean => {
  if (typeof process === 'undefined' || typeof process.env !== 'object') {
    return false;
  }
  return process.env.NEXT_RUNTIME === 'edge' ||
    (process.env.NEXT_RUNTIME ?? '').toLowerCase() === 'edge';
};

export const isBuilding = (): boolean => {
  if (typeof process === 'undefined' || typeof process.env !== 'object') {
    return false;
  }
  return !!process.env.NEXT_PHASE && 
    process.env.NEXT_PHASE.indexOf('-build') > 0;
};

export const ZodProcessors = {
  url: (): z.ZodEffects<z.ZodString, string, string> =>
    z.string().transform((val, ctx) => {
      try {
        const url = new URL(val);
        // Remove trailing slash if present
        return url.href.replace(/\/$/, '');
      } catch (error: unknown) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid URL: ${val} - ${LoggedError.isTurtlesAllTheWayDownBaby(error).message}`,
        });
        return z.NEVER;
      }
    }),
  logLevel: (level: string = 'info'): z.ZodDefault<z.ZodString> =>
    z.string().default(level),

  aiModelType: (
    defaultValue: AiModelType,
  ): z.ZodDefault<z.ZodType<AiModelType, z.ZodTypeDef, unknown>> =>
    z
      .preprocess((val, ctx) => {
        if (isAiModelType(val)) {
          return val;
        }
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid AI model type: ${val}`,
          path: ctx.path,
        });
        return z.NEVER;
      }, z.enum(AiModelTypeValues))
      .default(defaultValue),
  integer: (): z.ZodType<number, z.ZodTypeDef, unknown> =>
    z.preprocess((val) => {
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed)) {
          return parsed;
        }
      }
      return val;
    }, z.number().int()),

  boolean: (): z.ZodDefault<z.ZodBoolean> => z.boolean().default(false),

  truthy: (
    defaultValue = false,
  ): z.ZodType<boolean, z.ZodEffectsDef<z.ZodBoolean>, unknown> =>
    z.preprocess(
      (val: unknown) => {
        return typeof val === 'undefined' ||
          val === undefined ||
          val === null ||
          (typeof val === 'string' && val.trim() === '')
          ? !!defaultValue
          : isTruthy(val);
      },
      z.boolean(),
      z.boolean(),
    ),

  array: (): z.ZodDefault<z.ZodArray<z.ZodUnknown>> =>
    z.array(z.unknown()).default([]),

  object: (): z.ZodDefault<z.ZodObject<z.ZodRawShape>> =>
    z.object({}).default({}),

  nullableString: (): z.ZodEffects<
    z.ZodNullable<z.ZodString>,
    string | null,
    string | null
  > =>
    z
      .string()
      .nullable()
      .transform((val) => (val ? val.trim() : null)),
};

export const getMappedSource = <
  TSource extends Record<string, string | number | undefined>,
>(
  source: TSource,
): Record<keyof TSource, string | number | undefined> => {
  // Handle environments where process.env does not exist (eg client)
  if (
    typeof process !== 'object' ||
    !process ||
    typeof process.env !== 'object' ||
    !process.env
  ) {
    return source;
  }
  const getRawValue = (key: keyof TSource): string | number | undefined => {
    const envValue = process.env[key as string];
    if (typeof envValue === 'string' && envValue.trim() !== '') {
      return envValue;
    }
    return source[key];
  };
  return Object.keys(source).reduce(
    (acc, key) => {
      acc[key as keyof TSource] = getRawValue(key as keyof TSource);
      return acc;
    },
    {} as Record<keyof TSource, string | number | undefined>,
  );
};
