'use client';
import React, { createContext, useContext } from 'react';
import { useMemoryHealth } from '@/lib/hooks/use-memory-health';
const HealthContext = createContext(undefined);
export function HealthProvider({ children }) {
    const healthData = useMemoryHealth();
    return (<HealthContext.Provider value={healthData}>
      {children}
    </HealthContext.Provider>);
}
export const useHealth = () => {
    const context = useContext(HealthContext);
    if (context === undefined) {
        throw new Error('useHealth must be used within a HealthProvider');
    }
    return context;
};
//# sourceMappingURL=health-context.jsx.map