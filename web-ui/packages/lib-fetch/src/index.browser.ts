/* global RequestInit */

import type { IFetchService } from '@compliance-theater/types/lib/fetch';

import { fetch as browserFetch } from './fetch';
import {
    createFetch,
    registerFetchService,
    type RuntimeFetch,
} from './create-fetch-service';

const runtimeFetch = browserFetch as RuntimeFetch;

export const fetch = createFetch({
    runtimeFetch,
});

export const fetchServiceFactory: () => IFetchService = () => ({
    fetch,
});

// This package is a foundational dependency; register immediately for downstream services.
registerFetchService(runtimeFetch);

export type { IFetchService } from '@compliance-theater/types/lib/fetch';

export type {
    RequestInfo,
    RequestInit,
    Response,
    Request,
} from './fetch/shared-types';
