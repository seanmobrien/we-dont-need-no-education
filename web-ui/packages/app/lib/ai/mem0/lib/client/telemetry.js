import { log } from '@compliance-theater/logger/core';
import { fetch } from '@/lib/nextjs-util/fetch';
import { cryptoRandomBytes } from '@/lib/react-util/crypto-random-bytes';
let version = '2.1.26';
let MEM0_TELEMETRY = true;
try {
    MEM0_TELEMETRY = process?.env?.MEM0_TELEMETRY === 'false' ? false : true;
}
catch (error) { }
const POSTHOG_API_KEY = 'phc_hgJkUVJFYtmaJqrvf6CYN67TIQ8yhXAkWzUn9AMU4yX';
const POSTHOG_HOST = 'https://us.i.posthog.com/i/v0/e/';
const generateHash = (input) => {
    const randomBytes = cryptoRandomBytes(16);
    return randomBytes.toString('hex');
};
class UnifiedTelemetry {
    apiKey;
    host;
    constructor(projectApiKey, host) {
        this.apiKey = projectApiKey;
        this.host = host;
    }
    async captureEvent(distinctId, eventName, properties = {}) {
        if (!MEM0_TELEMETRY)
            return;
        const eventProperties = {
            client_version: version,
            timestamp: new Date().toISOString(),
            ...properties,
            $process_person_profile: false,
            $lib: 'posthog-node',
        };
        const payload = {
            api_key: this.apiKey,
            distinct_id: distinctId,
            event: eventName,
            properties: eventProperties,
        };
        try {
            const response = await fetch(this.host, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const errorText = await response.text();
                const error = new Error(`Telemetry event failed: ${response.status} ${response.statusText} - ${errorText}`);
                LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: true,
                    source: 'captureClientEvent',
                });
            }
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'captureClientEvent',
            });
        }
    }
    async shutdown() {
    }
}
const telemetry = new UnifiedTelemetry(POSTHOG_API_KEY, POSTHOG_HOST);
async function captureClientEvent(eventName, instance, additionalData = {}) {
    if (!instance.telemetryId) {
        log((l) => l.warn('No telemetry ID found for instance'));
        return;
    }
    const eventData = {
        function: `${instance.constructor.name}`,
        method: eventName,
        api_host: instance.host,
        timestamp: new Date().toISOString(),
        client_version: version,
        keys: additionalData?.keys || [],
        ...additionalData,
    };
    await telemetry.captureEvent(instance.telemetryId, `client.${eventName}`, eventData);
}
export { telemetry, captureClientEvent, generateHash };
//# sourceMappingURL=telemetry.js.map