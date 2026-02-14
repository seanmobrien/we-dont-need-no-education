export { createMessageStructureOptions, isPreservationEnabled, hasMessageStructureOptions, DEFAULT_MESSAGE_STRUCTURE_OPTIONS, } from './types/message-structure-preservation';
export { preserveMessageStructure, validateMessageStructureOptions, createPresetConfiguration, clearPreservationCache, getPreservationCacheStats, } from './utils/message-structure-preservation';
export const PRESET_CONFIGURATIONS = {
    minimal: 'minimal',
    balanced: 'balanced',
    comprehensive: 'comprehensive',
    performance: 'performance',
};
export const PRESERVATION_STRATEGIES = {
    full: 'full',
    contentOnly: 'content-only',
    semantic: 'semantic',
    minimal: 'minimal',
    custom: 'custom',
};
//# sourceMappingURL=message-structure-preservation.js.map