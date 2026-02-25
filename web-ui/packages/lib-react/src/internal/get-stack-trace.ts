import { getStackTrace as getStackTraceBase } from "@compliance-theater/types/get-stack-trace";
import { deprecate } from "@compliance-theater/types/deprecate";

/**
 * Get a filtered stack trace
 * Copied from nextjs-util to avoid dependency on un-extracted package
 */
export const getStackTrace = deprecate(getStackTraceBase,
  'Use getStackTrace from @compliance-theater/types instead',
  'DEP004'
);