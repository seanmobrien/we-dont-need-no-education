// src/_common.ts
import { isTruthy } from "@repo/app/lib/react-util/utility-methods";
import { LoggedError } from "@repo/app/lib/react-util/errors/logged-error";
import z from "zod";
import { isAiModelType } from "@repo/app/lib/ai/core/guards";
import { AiModelTypeValues } from "@repo/app/lib/ai/core/unions";
var currentRuntime = (() => {
  if (typeof window !== "undefined") {
    if ("Deno" in window) {
      return "edge";
    } else if ("process" in window) {
      return "nodejs";
    }
    return "client";
  } else {
    if (typeof process !== "undefined") {
      return "nodejs";
    }
    return "server";
  }
  return "static";
})();
var runtime = () => currentRuntime;
var isRunningOnServer = () => currentRuntime !== "client" && !!process.env.AUTH_SECRET;
var isRunningOnClient = () => {
  switch (currentRuntime) {
    case "client":
      return true;
    case "edge":
      return false;
    default:
      return !process.env.AUTH_SECRET;
  }
};
var isRunningOnEdge = () => process.env.NEXT_RUNTIME === "edge" || (process.env.NEXT_RUNTIME ?? "").toLowerCase() === "edge";
var ZodProcessors = {
  /**
   * Processor for URL strings.
   * Ensures the value is a valid URL and removes trailing slashes.
   *
   * @returns {ZodString} A Zod string schema for URLs.
   */
  url: () => z.string().transform((val, ctx) => {
    try {
      const url = new URL(val);
      return url.href.replace(/\/$/, "");
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid URL: ${val} - ${LoggedError.isTurtlesAllTheWayDownBaby(error).message}`
      });
      return z.NEVER;
    }
  }),
  /**
   * Processor for log level strings.
   * Provides a default value of 'info' if not specified.
   *
   * @returns {ZodString} A Zod string schema for log levels.
   */
  logLevel: (level = "info") => z.string().default(level ?? "info"),
  aiModelType: (defaultValue) => z.preprocess((val, ctx) => {
    if (isAiModelType(val)) {
      return val;
    }
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid AI model type: ${val}`,
      path: ctx.path
    });
    return z.NEVER;
  }, z.enum(AiModelTypeValues)).default(defaultValue),
  /**
   * Processor for integer values.
   * Ensures the value is a valid integer and provides a default value of 120 if not specified.
   *
   * @returns {ZodType<number, ZodTypeDef, unknown>} A Zod schema for integers.
   */
  integer: () => z.preprocess((val) => {
    if (typeof val === "string") {
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    return val;
  }, z.number().int()),
  /**
   * Processor for boolean values.
   * Ensures the value is a valid boolean and provides a default value of false if not specified.
   *
   * @returns {ZodBoolean} A Zod boolean schema.
   */
  boolean: () => z.boolean().default(false),
  /**
   * Processor for truthy boolean values.
   * Ensures the value is a valid boolean and provides a default value if not specified.
   *
   * @returns {ZodBoolean} A Zod boolean schema.
   */
  truthy: (defaultValue = false) => z.preprocess(
    (val) => {
      return typeof val === void 0 || val === null || typeof val === "string" && val.trim() === "" ? !!defaultValue : isTruthy(val);
    },
    z.boolean(),
    z.boolean()
  ),
  /**
   * Processor for array values.
   * Ensures the value is a valid array and provides a default value of an empty array if not specified.
   *
   * @returns {ZodArray} A Zod array schema.
   */
  array: () => z.array(z.unknown()).default([]),
  /**
   * Processor for object values.
   * Ensures the value is a valid object and provides a default value of an empty object if not specified.
   *
   * @returns {ZodObject} A Zod object schema.
   */
  object: () => z.object({}).default({}),
  /**
   * Trimmed nullable string processor
   * @returns
   */
  nullableString: () => z.string().nullable().transform((val) => val ? val.trim() : null)
};
var getMappedSource = (source) => {
  if (typeof process !== "object" || !process || typeof process.env !== "object" || !process.env) {
    return source;
  }
  const getRawValue = (key) => {
    const envValue = process.env[key];
    if (typeof envValue === "string" && envValue.trim() !== "") {
      return envValue;
    }
    return source[key];
  };
  return Object.keys(source).reduce(
    (acc, key) => {
      acc[key] = getRawValue(key);
      return acc;
    },
    {}
  );
};

export {
  runtime,
  isRunningOnServer,
  isRunningOnClient,
  isRunningOnEdge,
  ZodProcessors,
  getMappedSource
};
