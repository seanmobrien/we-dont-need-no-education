import {
  asFunction,
  getServiceContainer,
} from '@compliance-theater/types/dependency-injection/container';

import FetchServiceRegistrar from '@compliance-theater/fetch/service-registrar/node';
import AuthServiceRegistrar from '@compliance-theater/auth/service-registrar/node';
import AfterServiceRegistrar from '@compliance-theater/after/service-registrar/node';
import LoggerServiceRegistrar from '@compliance-theater/logger/service-registrar/node';
import { AppStartupManager } from '@compliance-theater/after/app-startup';
import { configureServerRequestBootstrap } from '@compliance-theater/nextjs/server/di-bootstrap-accessor';

import { appStartupConfig } from '@/lib/site-util/app-startup';

const DI_BOOTSTRAP_KEY = Symbol.for('@noeducation/app/di-bootstrap');

type GlobalWithDiBootstrap = typeof globalThis & {
  [DI_BOOTSTRAP_KEY]?: boolean;
};

export const ensureServerDiBootstrap = (): void => {
  const globalWithBootstrap = globalThis as GlobalWithDiBootstrap;
  if (globalWithBootstrap[DI_BOOTSTRAP_KEY]) {
    return;
  }

  const container = getServiceContainer();
  new LoggerServiceRegistrar().register(container);
  new FetchServiceRegistrar().register(container);
  new AuthServiceRegistrar().register(container);
  new AfterServiceRegistrar().register(container);

  container.register(
    'startup',
    asFunction(() => new AppStartupManager(appStartupConfig)),
  );

  globalWithBootstrap[DI_BOOTSTRAP_KEY] = true;
};

configureServerRequestBootstrap(ensureServerDiBootstrap);