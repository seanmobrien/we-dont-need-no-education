
export type IClientNavigationService = {
    clientNavigateSignIn: () => void;
    clientReload: () => void;
    navigateTo: (url: string) => void;
};