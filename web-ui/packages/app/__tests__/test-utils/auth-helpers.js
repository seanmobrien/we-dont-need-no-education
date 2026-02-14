import { env } from '@compliance-theater/env';
export const validateLocalhost = (req) => {
    const bypassUserId = env('LOCAL_DEV_AUTH_BYPASS_USER_ID');
    if (!bypassUserId) {
        return;
    }
    let hostname = '';
    if (req) {
        const url = new URL(req.url);
        hostname = url.hostname;
    }
    else {
        const publicHostname = env('NEXT_PUBLIC_HOSTNAME');
        if (publicHostname) {
            hostname = new URL(publicHostname).hostname;
        }
    }
    const isLocalhost = hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.16.') ||
        hostname.endsWith('.local');
    if (!isLocalhost) {
        throw new Error(`
🚨🚨🚨 CRITICAL SECURITY WARNING 🚨🚨🚨

LOCAL_DEV_AUTH_BYPASS_USER_ID is set but you're not running on localhost!
Current hostname: ${hostname}

This environment variable MUST NEVER be set in production or any non-local environment.
If you see this error:
1. IMMEDIATELY remove LOCAL_DEV_AUTH_BYPASS_USER_ID from your environment
2. Check your .env files and remove any reference to this variable
3. NEVER commit code with this variable set to any value

Continuing with this variable set in a non-localhost environment could compromise 
the security of your entire application and expose user data.

Remember: We don't threaten to fire people for exposing secrets - we make threats 
against things people actually care about. Don't make us test that theory.

🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨
    `);
    }
};
export const shouldUseLocalDevBypass = (req) => {
    const bypassUserId = env('LOCAL_DEV_AUTH_BYPASS_USER_ID');
    if (!bypassUserId || bypassUserId.trim() === '') {
        return false;
    }
    validateLocalhost(req);
    return true;
};
export const createLocalDevBypassUser = (req) => {
    if (!shouldUseLocalDevBypass(req)) {
        return null;
    }
    const bypassUserId = env('LOCAL_DEV_AUTH_BYPASS_USER_ID');
    return {
        id: bypassUserId,
        account_id: parseInt(bypassUserId) || 1,
        image: '',
        name: `Local Dev User ${bypassUserId}`,
        email: `localdev-${bypassUserId}@localhost.dev`,
    };
};
//# sourceMappingURL=auth-helpers.js.map