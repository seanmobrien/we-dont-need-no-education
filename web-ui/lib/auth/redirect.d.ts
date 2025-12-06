declare module '@/lib/auth/redirect' {
  /**
   * Securely handle OAuth redirect URLs to prevent open redirect vulnerabilities.
   * @param url URL provided as callback URL by the client
   * @param baseUrl Default base URL of site (can be used as fallback)
   * @returns {Promise<string>} Safe OAuth redirect_to value.
   */
  export function redirect({
    url,
    baseUrl,
  }: {
    /** URL provided as callback URL by the client */
    url: string;
    /** Default base URL of site (can be used as fallback) */
    baseUrl: string;
  }): Promise<string>;
}
