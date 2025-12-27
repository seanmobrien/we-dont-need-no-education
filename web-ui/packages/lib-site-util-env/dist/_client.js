"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/_client.ts
var client_exports = {};
__export(client_exports, {
  clientEnvFactory: () => clientEnvFactory,
  clientEnvSchema: () => clientEnvSchema,
  clientRawInstance: () => clientRawInstance
});
module.exports = __toCommonJS(client_exports);
var import_zod2 = require("zod");
var import_client = require("@repo/app/lib/ai/client");

// src/_common.ts
var import_utility_methods = require("@repo/app/lib/react-util/utility-methods");
var import_logged_error = require("@repo/app/lib/react-util/errors/logged-error");
var import_zod = __toESM(require("zod"));
var import_guards = require("@repo/app/lib/ai/core/guards");
var import_unions = require("@repo/app/lib/ai/core/unions");
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
var ZodProcessors = {
  /**
   * Processor for URL strings.
   * Ensures the value is a valid URL and removes trailing slashes.
   *
   * @returns {ZodString} A Zod string schema for URLs.
   */
  url: () => import_zod.default.string().transform((val, ctx) => {
    try {
      const url = new URL(val);
      return url.href.replace(/\/$/, "");
    } catch (error) {
      ctx.addIssue({
        code: import_zod.default.ZodIssueCode.custom,
        message: `Invalid URL: ${val} - ${import_logged_error.LoggedError.isTurtlesAllTheWayDownBaby(error).message}`
      });
      return import_zod.default.NEVER;
    }
  }),
  /**
   * Processor for log level strings.
   * Provides a default value of 'info' if not specified.
   *
   * @returns {ZodString} A Zod string schema for log levels.
   */
  logLevel: (level = "info") => import_zod.default.string().default(level ?? "info"),
  aiModelType: (defaultValue) => import_zod.default.preprocess((val, ctx) => {
    if ((0, import_guards.isAiModelType)(val)) {
      return val;
    }
    ctx.addIssue({
      code: import_zod.default.ZodIssueCode.custom,
      message: `Invalid AI model type: ${val}`,
      path: ctx.path
    });
    return import_zod.default.NEVER;
  }, import_zod.default.enum(import_unions.AiModelTypeValues)).default(defaultValue),
  /**
   * Processor for integer values.
   * Ensures the value is a valid integer and provides a default value of 120 if not specified.
   *
   * @returns {ZodType<number, ZodTypeDef, unknown>} A Zod schema for integers.
   */
  integer: () => import_zod.default.preprocess((val) => {
    if (typeof val === "string") {
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    return val;
  }, import_zod.default.number().int()),
  /**
   * Processor for boolean values.
   * Ensures the value is a valid boolean and provides a default value of false if not specified.
   *
   * @returns {ZodBoolean} A Zod boolean schema.
   */
  boolean: () => import_zod.default.boolean().default(false),
  /**
   * Processor for truthy boolean values.
   * Ensures the value is a valid boolean and provides a default value if not specified.
   *
   * @returns {ZodBoolean} A Zod boolean schema.
   */
  truthy: (defaultValue = false) => import_zod.default.preprocess(
    (val) => {
      return typeof val === void 0 || val === null || typeof val === "string" && val.trim() === "" ? !!defaultValue : (0, import_utility_methods.isTruthy)(val);
    },
    import_zod.default.boolean(),
    import_zod.default.boolean()
  ),
  /**
   * Processor for array values.
   * Ensures the value is a valid array and provides a default value of an empty array if not specified.
   *
   * @returns {ZodArray} A Zod array schema.
   */
  array: () => import_zod.default.array(import_zod.default.unknown()).default([]),
  /**
   * Processor for object values.
   * Ensures the value is a valid object and provides a default value of an empty object if not specified.
   *
   * @returns {ZodObject} A Zod object schema.
   */
  object: () => import_zod.default.object({}).default({}),
  /**
   * Trimmed nullable string processor
   * @returns
   */
  nullableString: () => import_zod.default.string().nullable().transform((val) => val ? val.trim() : null)
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

// src/_client.ts
var clientRawInstance = {
  NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING: process.env.NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING,
  /**
   * The cache timeout for client-side data grids.
   * @type {number | undefined}
   */
  NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT: process.env.NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT ?? 5 * 60 * 1e3,
  /**
   * The default AI model
   */
  NEXT_PUBLIC_DEFAULT_AI_MODEL: process.env.NEXT_PUBLIC_DEFAULT_AI_MODEL,
  /**
   * The hostname for the public-facing application.
   * @type {string | undefined}
   */
  NEXT_PUBLIC_HOSTNAME: process.env.NEXT_PUBLIC_HOSTNAME,
  /**
   * The log level for client-side logging.
   * @type {string | undefined}
   */
  NEXT_PUBLIC_LOG_LEVEL_CLIENT: process.env.NEXT_PUBLIC_LOG_LEVEL_CLIENT ?? "silly",
  /**
   * Flagsmith API URL for feature flag management and retrieval.
   */
  NEXT_PUBLIC_FLAGSMITH_API_URL: process.env.NEXT_PUBLIC_FLAGSMITH_API_URL,
  /**
   * Flagsmith environment ID for scoping feature flags.
   */
  NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID: process.env.NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID,
  /**
   * The license key for MUI X Pro components.
   */
  NEXT_PUBLIC_MUI_LICENSE: process.env.NEXT_PUBLIC_MUI_LICENSE
};
var clientEnvSchema = import_zod2.z.object({
  NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING: import_zod2.z.string().optional(),
  NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT: ZodProcessors.integer().default(
    5 * 60 * 1e3
  ),
  NEXT_PUBLIC_DEFAULT_AI_MODEL: import_zod2.z.string().transform((val) => {
    return (0, import_client.isAiLanguageModelType)(val) ? val : "hifi";
  }).default("hifi"),
  NEXT_PUBLIC_FLAGSMITH_API_URL: import_zod2.z.string().min(1),
  NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID: import_zod2.z.string().min(1),
  NEXT_PUBLIC_HOSTNAME: ZodProcessors.url().default("http://localhost:3000"),
  NEXT_PUBLIC_LOG_LEVEL_CLIENT: ZodProcessors.logLevel().default("silly"),
  NEXT_PUBLIC_MUI_LICENSE: import_zod2.z.string().default("")
});
var clientEnvFactory = () => clientEnvSchema.parse(getMappedSource(clientRawInstance));
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  clientEnvFactory,
  clientEnvSchema,
  clientRawInstance
});
