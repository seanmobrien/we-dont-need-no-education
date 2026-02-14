export const clientReload = () => {
    if (typeof window !== 'undefined' &&
        window.location &&
        window.location.reload) {
        window.location.reload();
    }
};
export const clientNavigate = (url) => {
    if (typeof window !== 'undefined' &&
        window.location &&
        window.location.href) {
        window.location.href = url;
    }
};
export const clientNavigateSignIn = () => clientNavigate('/auth/signin');
//# sourceMappingURL=client-navigate.js.map