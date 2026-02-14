import { env } from '@compliance-theater/env';
export const normalizePath = (path) => {
    const s = String(path);
    return (s.endsWith('/') && s !== '/' ? s.replace(/\/+$/, '') : s);
};
export const getLastPathSegment = (pathname) => {
    if (!pathname)
        return undefined;
    const withoutQuery = String(pathname).split('?')[0].split('#')[0];
    const parts = withoutQuery.split('/').filter(Boolean);
    return parts[parts.length - 1];
};
export const makeAbsoluteUrl = (relativeUrl) => {
    if (!relativeUrl)
        return '';
    return new URL(String(relativeUrl), new URL(env('NEXT_PUBLIC_HOSTNAME'))).toString();
};
//# sourceMappingURL=url.js.map