export const clientReload = () => {
  if (
    typeof window !== 'undefined' &&
    window.location &&
    window.location.reload
  ) {
    window.location.reload();
  }
};

export const clientNavigate = (url: string): void => {
  if (
    typeof window !== 'undefined' &&
    window.location &&
    window.location.href
  ) {
    window.location.href = url;
  }
};

export const clientNavigateSignIn = (): void => clientNavigate('/auth/signin');
