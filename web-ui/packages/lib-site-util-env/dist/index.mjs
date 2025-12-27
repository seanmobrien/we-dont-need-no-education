import {
  serverEnvFactory
} from "./chunk-36OTD5LT.mjs";
import {
  clientEnvFactory
} from "./chunk-ZPGIGFPE.mjs";
import {
  isRunningOnClient,
  isRunningOnEdge,
  isRunningOnServer,
  runtime
} from "./chunk-T2KRQTZW.mjs";

// src/index.ts
var envInstance;
var env = (key) => {
  if (!envInstance) {
    envInstance = isRunningOnClient() ? clientEnvFactory() : serverEnvFactory();
  }
  if (key === void 0) {
    return envInstance;
  }
  return envInstance[key];
};
export {
  env,
  isRunningOnClient,
  isRunningOnEdge,
  isRunningOnServer,
  runtime
};
