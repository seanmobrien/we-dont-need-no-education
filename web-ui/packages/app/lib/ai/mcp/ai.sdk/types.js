import { z } from 'zod';
export const LATEST_PROTOCOL_VERSION = '2024-11-05';
export const SUPPORTED_PROTOCOL_VERSIONS = [
    LATEST_PROTOCOL_VERSION,
    '2024-10-07',
];
const ClientOrServerImplementationSchema = z
    .object({
    name: z.string(),
    version: z.string(),
})
    .passthrough();
export const BaseParamsSchema = z
    .object({
    _meta: z.optional(z.object({}).passthrough()),
})
    .passthrough();
export const ResultSchema = BaseParamsSchema;
export const RequestSchema = z.object({
    method: z.string(),
    params: z.optional(BaseParamsSchema),
});
const ServerCapabilitiesSchema = z
    .object({
    experimental: z.optional(z.object({}).passthrough()),
    logging: z.optional(z.object({}).passthrough()),
    prompts: z.optional(z
        .object({
        listChanged: z.optional(z.boolean()),
    })
        .passthrough()),
    resources: z.optional(z
        .object({
        subscribe: z.optional(z.boolean()),
        listChanged: z.optional(z.boolean()),
    })
        .passthrough()),
    tools: z.optional(z
        .object({
        listChanged: z.optional(z.boolean()),
    })
        .passthrough()),
})
    .passthrough();
export const InitializeResultSchema = ResultSchema.extend({
    protocolVersion: z.string(),
    capabilities: ServerCapabilitiesSchema,
    serverInfo: ClientOrServerImplementationSchema,
    instructions: z.optional(z.string()),
});
const PaginatedResultSchema = ResultSchema.extend({
    nextCursor: z.optional(z.string()),
});
const ToolSchema = z
    .object({
    name: z.string(),
    description: z.optional(z.string()),
    inputSchema: z
        .object({
        type: z.literal('object'),
        properties: z.optional(z.object({}).passthrough()),
    })
        .passthrough(),
})
    .passthrough();
export const ListToolsResultSchema = PaginatedResultSchema.extend({
    tools: z.array(ToolSchema),
});
const TextContentSchema = z
    .object({
    type: z.literal('text'),
    text: z.string(),
})
    .passthrough();
const ImageContentSchema = z
    .object({
    type: z.literal('image'),
    data: z.string().base64(),
    mimeType: z.string(),
})
    .passthrough();
const ResourceContentsSchema = z
    .object({
    uri: z.string(),
    mimeType: z.optional(z.string()),
})
    .passthrough();
const TextResourceContentsSchema = ResourceContentsSchema.extend({
    text: z.string(),
});
const BlobResourceContentsSchema = ResourceContentsSchema.extend({
    blob: z.string().base64(),
});
const EmbeddedResourceSchema = z
    .object({
    type: z.literal('resource'),
    resource: z.union([TextResourceContentsSchema, BlobResourceContentsSchema]),
})
    .passthrough();
export const CallToolResultSchema = ResultSchema.extend({
    content: z.array(z.union([TextContentSchema, ImageContentSchema, EmbeddedResourceSchema])),
    isError: z.boolean().default(false).optional(),
}).or(ResultSchema.extend({
    toolResult: z.unknown(),
}));
//# sourceMappingURL=types.js.map