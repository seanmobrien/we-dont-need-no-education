import { env } from '@compliance-theater/env';

/**
 * Overrides default behavior of @ai-sdk/provider-utils loadApiKey to account for the fact that, well, we're not using an API key.
 * @param param0
 * @returns
 */
export const loadApiKey = ({
  apiKey,
  environmentVariableName,
  apiKeyParameterName,
}: {
  apiKey: string | undefined;
  environmentVariableName: string;
  apiKeyParameterName?: string;
  description?: string;
}): string =>
  apiKey ??
  process.env[environmentVariableName] ??
  (apiKeyParameterName ? process.env[apiKeyParameterName] : undefined) ??
  '';

/**
 * Helper function to construct a mem0 api url.
 * @param relativePath - The relative path to append to the base URL.
 * @returns The full API URL.
 */
export const getMem0ApiUrl = (relativePath: string): string => {
  const baseUrl = env('MEM0_API_HOST');
  return new URL(relativePath, baseUrl).toString();
};
