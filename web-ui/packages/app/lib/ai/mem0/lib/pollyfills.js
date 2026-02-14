import { env } from '@compliance-theater/env';
export const loadApiKey = ({ apiKey, environmentVariableName, apiKeyParameterName, }) => apiKey ??
    process.env[environmentVariableName] ??
    (apiKeyParameterName ? process.env[apiKeyParameterName] : undefined) ??
    '';
export const getMem0ApiUrl = (relativePath) => {
    const baseUrl = env('MEM0_API_HOST');
    return new URL(relativePath, baseUrl).toString();
};
//# sourceMappingURL=pollyfills.js.map