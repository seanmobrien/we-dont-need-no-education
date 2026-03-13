import {
    IServiceRegistrar,
    type IServiceContainer,
} from '@compliance-theater/types/dependency-injection';

import { fetch as browserFetch } from './fetch';
import {
    registerFetchServiceIntoContainer,
    type RuntimeFetch,
} from './create-fetch-service';

const runtimeFetch = browserFetch as RuntimeFetch;

export class ServiceRegistrar implements IServiceRegistrar {
    register(container: IServiceContainer): void {
        registerFetchServiceIntoContainer(container, runtimeFetch);
    }
}

export default ServiceRegistrar;