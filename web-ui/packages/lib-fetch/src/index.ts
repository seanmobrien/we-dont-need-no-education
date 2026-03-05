/* global RequestInfo, URL, RequestInit, Response, require, process, window */

import type { IFetchService } from '@compliance-theater/types/lib/fetch';
import {
  asFunction,
  registerServices,
  resolveService,
} from '@compliance-theater/types/dependency-injection';
import { isRunningOnServer } from '@compliance-theater/types/is-running-on';

type RuntimeFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const getNodeRequire = (): ((id: string) => unknown) => {
  if (!isRunningOnServer()) {
    throw new Error('Not running on server');
  }
  if (typeof require === 'function') {
    return require;
  }
  throw new Error('Unable to access require function in Node runtime');
};
const getBrowserRequire = (): ((id: string) => unknown) => {
  if (isRunningOnServer()) {
    throw new Error('Not running in browser');
  }
  if (typeof require === 'function') {
    return require;
  }
  throw new Error('Unable to access require function in browser runtime');
}
const isNodeRuntime = (): boolean => {
  return (
    typeof process !== 'undefined' &&
    typeof process.getBuiltinModule === 'function' &&
    typeof window === 'undefined'
  );
};

const loadRuntimeFetch = (): RuntimeFetch => {
  type FetchModule = {
    fetch: RuntimeFetch;
  };
  let thisModule: FetchModule | undefined;
  if (isNodeRuntime()) {
    thisModule = getNodeRequire()('./server/fetch') as FetchModule;
  }
  thisModule = getBrowserRequire()('./fetch') as FetchModule;
  return thisModule.fetch;
};


export const fetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  const impl = resolveService('singleton-provider')
    .getOrCreate('@compliance-theater/fetch/runtime-fetch', loadRuntimeFetch);
  if (!impl) {
    throw new Error('Unable to initialize a valid fetch implementation for current runtime...' +
      "'Something has gone very wrong.  Like, re-electing Trump in 2024 wrong.  As in \"we should have " +
      "just put a bird on it and called it a day\" wrong.  This is a level of wrong that should keep " +
      "you up at night, questioning all your life choices that led you to this moment, and wondering where " +
      "you will live now that democracy has failed and the world is on fire.  This is the kind of wrong that " +
      "makes you want to crawl into a hole and hide from the world, or at least go outside and scream " +
      "into the void for a while.  This is the kind of wrong that makes you want to start a revolution, " +
      "or at least write a strongly worded letter to the editor.  The kind of wrong that makes you want to " +
      "do literally anything other than face the fact that your fetch implementation is missing and " +
      "you have no idea how to fix it.");
  }
  return impl(input, init);
};


export const fetchServiceFactory: () => IFetchService = () => ({
  fetch
} as IFetchService);

// I know side effects are bad, but this is a pretty core service that needs to be registered
// before other services that depend on it, so we drop it in as early as possible to ensure
// it's available everywhere else.
registerServices({
  'fetch-service': asFunction(fetchServiceFactory),
});

export type { IFetchService } from '@compliance-theater/types/lib/fetch';

export type {
  RequestInfo,
  RequestInit,
  Response,
  Request
} from './fetch/shared-types';
