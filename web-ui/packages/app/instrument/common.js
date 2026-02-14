const SERVICE_NAME = 'WebUi';
const SERVICE_NAMESPACE = 'ObApps.ComplianceTheatre';
const SERVICE_VERSION = '1.0.0';
const SCHEMA_URL = 'https://opentelemetry.io/schemas/1.30.0';
const SERVICE_ID = 'WebUi-' +
    process.env.NEXT_RUNTIME +
    '-' +
    process.env.NEXT_PHASE +
    '-' +
    Math.random().toString(36).substring(2, 15);
export const config = {
    serviceName: SERVICE_NAME,
    attributes: {
        'service.namespace': SERVICE_NAMESPACE,
        'service.name': SERVICE_NAME,
        'service.version': SERVICE_VERSION,
        'service.schema_url': SCHEMA_URL,
        'service.instance': SERVICE_ID,
    },
    attributesFromHeaders: {
        client: 'X-Client',
        page: 'x-active-page',
        chatHistoryId: 'x-chat-history-id',
        pageCasefileId: 'x-page-casefile-id',
        userId: 'x-user-id',
    },
};
//# sourceMappingURL=common.js.map