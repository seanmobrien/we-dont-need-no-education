export function hasMessageStructureOptions(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'messageStructure' in obj &&
        typeof obj.messageStructure === 'object');
}
export function isPreservationEnabled(options) {
    return options.enabled !== false;
}
export const DEFAULT_MESSAGE_STRUCTURE_OPTIONS = {
    enabled: true,
    strategy: 'semantic',
    partRules: {
        text: true,
        toolCall: true,
        toolResult: true,
        file: true,
        image: true,
        dynamic: false,
    },
    metadata: {
        timestamps: true,
        userIds: true,
        messageIds: true,
        toolMetadata: true,
        customFields: [],
    },
    contentTransformation: {
        maxContentLength: 2000,
        truncateContent: true,
        truncationSuffix: '...',
        summarizeContent: false,
    },
    contextual: {
        recentInteractionCount: 5,
    },
    performance: {
        enableCaching: true,
        cacheTtlMs: 300000,
        maxCacheSize: 1000,
        enableAsyncProcessing: false,
    },
    debug: false,
};
export function createMessageStructureOptions(options = {}) {
    return {
        ...DEFAULT_MESSAGE_STRUCTURE_OPTIONS,
        ...options,
        partRules: {
            ...DEFAULT_MESSAGE_STRUCTURE_OPTIONS.partRules,
            ...options.partRules,
        },
        metadata: {
            ...DEFAULT_MESSAGE_STRUCTURE_OPTIONS.metadata,
            ...options.metadata,
        },
        contentTransformation: {
            ...DEFAULT_MESSAGE_STRUCTURE_OPTIONS.contentTransformation,
            ...options.contentTransformation,
        },
        contextual: {
            ...DEFAULT_MESSAGE_STRUCTURE_OPTIONS.contextual,
            ...options.contextual,
        },
        performance: {
            ...DEFAULT_MESSAGE_STRUCTURE_OPTIONS.performance,
            ...options.performance,
        },
    };
}
//# sourceMappingURL=message-structure-preservation.js.map