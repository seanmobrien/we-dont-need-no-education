import { env } from '@repo/lib-site-util-env';

export const redirect = ({
  url,
  baseUrl,
}: {
  /** URL provided as callback URL by the client */
  url: string;
  /** Default base URL of site (can be used as fallback) */
  baseUrl: string;
}): Promise<string> => {
  const providedUrl = new URL(url, baseUrl);
  // Only allow relative paths or same-origin URLs to prevent open redirect vulnerabilities
  return Promise.resolve(
    new URL(providedUrl.pathname, env('NEXT_PUBLIC_HOSTNAME')).toString(),
  );
};
