import { getServiceContainer } from '@compliance-theater/types/dependency-injection/container';

import FetchServiceRegistrar from '@compliance-theater/fetch/service-registrar/browser';
import AuthServiceRegistrar from '@compliance-theater/auth/service-registrar/browser';
import AfterServiceRegistrar from '@compliance-theater/after/service-registrar/browser';
import LoggerServiceRegistrar from '@compliance-theater/logger/service-registrar/browser';

const DI_BOOTSTRAP_KEY = Symbol.for('@noeducation/app/di-bootstrap');

type GlobalWithDiBootstrap = typeof globalThis & {
  [DI_BOOTSTRAP_KEY]?: boolean;
};

export const ensureBrowserDiBootstrap = (): void => {
  const globalWithBootstrap = globalThis as GlobalWithDiBootstrap;
  if (globalWithBootstrap[DI_BOOTSTRAP_KEY]) {
    return;
  }

  const container = getServiceContainer();
  new LoggerServiceRegistrar().register(container);
  new FetchServiceRegistrar().register(container);
  new AuthServiceRegistrar().register(container);
  new AfterServiceRegistrar().register(container);

  globalWithBootstrap[DI_BOOTSTRAP_KEY] = true;
};

export const ensureEdgeDiBootstrap = ensureBrowserDiBootstrap;