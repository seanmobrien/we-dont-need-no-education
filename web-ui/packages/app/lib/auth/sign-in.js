import { log, logEvent, LoggedError } from '@compliance-theater/logger';
import { updateAccountTokens } from './server/update-account-tokens';
const updateAccount = ({ account, user: { id: userId } = {}, }) => updateAccountTokens(userId, {
    accessToken: account.access_token,
    refreshToken: account.refresh_token,
    idToken: account.id_token,
    expiresAt: account.expires_at,
    exp: account.exp,
});
export const signIn = async ({ user, account, } = {
    user: undefined,
    account: undefined,
}) => {
    if (account && account.providerAccountId) {
        switch (account.provider) {
            case 'keycloak':
                updateAccount({ user, account }).catch((err) => {
                    LoggedError.isTurtlesAllTheWayDownBaby(err, {
                        source: 'auth.signIn.updateAccount',
                        log: true,
                        data: {
                            user,
                            account,
                        },
                    });
                    return Promise.resolve(false);
                });
                break;
            default:
                log((l) => l.warn(`Unhandled provider ${account?.provider} in signIn`));
                break;
        }
    }
    logEvent('signIn', {
        provider: account?.provider?.toString() ?? 'unknown',
        ...(account && account.providerAccountId
            ? {
                providerAccountId: String(account.providerAccountId).slice(0, 8),
                userId: user.id,
            }
            : {}),
    });
    return true;
};
//# sourceMappingURL=sign-in.js.map