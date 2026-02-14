import { useContext } from 'react';
import { SessionContext } from './provider';
export const useSession = () => {
    const session = useContext(SessionContext);
    if (!session) {
        throw new Error('useSession must be used within a SessionProvider');
    }
    return session;
};
//# sourceMappingURL=hooks.js.map