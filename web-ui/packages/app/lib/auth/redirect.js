import { env } from '@compliance-theater/env';
export const redirect = ({ url, baseUrl, }) => {
    const providedUrl = new URL(url, baseUrl);
    return Promise.resolve(new URL(providedUrl.pathname, env('NEXT_PUBLIC_HOSTNAME')).toString());
};
//# sourceMappingURL=redirect.js.map