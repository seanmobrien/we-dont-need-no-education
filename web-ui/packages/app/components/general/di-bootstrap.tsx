'use client';

import { ensureBrowserDiBootstrap } from '@/lib/bootstrap/di/browser';

ensureBrowserDiBootstrap();

const DiBootstrap = (): null => {
  ensureBrowserDiBootstrap();
  return null;
};

export default DiBootstrap;