export const isUserAuthorized = ({ signedInUserId, ownerUserId, write = false, }) => {
    if (!signedInUserId || !ownerUserId) {
        return Promise.resolve(false);
    }
    if (signedInUserId === ownerUserId) {
        return Promise.resolve(true);
    }
    return Promise.resolve(write !== true);
};
export const isSessionActive = (props) => {
    const { session } = props;
    if (!session) {
        return false;
    }
    if (!session.user || !session.user.id) {
        return false;
    }
    if (!session.expires) {
        return false;
    }
    const expirationTime = Date.parse(session.expires);
    if (isNaN(expirationTime)) {
        return false;
    }
    return expirationTime > Date.now();
};
//# sourceMappingURL=security.js.map