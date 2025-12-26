'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useMemoryHealth } from '@/lib/hooks/use-memory-health';
import { MemoryStatusHookResult } from '@/lib/hooks/types';

const HealthContext = createContext<MemoryStatusHookResult | undefined>(undefined);

export function HealthProvider({ children }: { children: ReactNode }) {
  const healthData = useMemoryHealth();

  return (
    <HealthContext.Provider value={healthData}>
      {children}
    </HealthContext.Provider>
  );
}

export const useHealth = () => {
  const context = useContext(HealthContext);
  if (context === undefined) {
    throw new Error('useHealth must be used within a HealthProvider');
  }
  return context;
}
