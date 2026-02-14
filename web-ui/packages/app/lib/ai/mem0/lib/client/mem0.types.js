export var OutputFormat;
(function (OutputFormat) {
    OutputFormat["V1"] = "v1.0";
    OutputFormat["V1_1"] = "v1.1";
})(OutputFormat || (OutputFormat = {}));
export var API_VERSION;
(function (API_VERSION) {
    API_VERSION["V1"] = "v1";
    API_VERSION["V2"] = "v2";
})(API_VERSION || (API_VERSION = {}));
export var Feedback;
(function (Feedback) {
    Feedback["POSITIVE"] = "POSITIVE";
    Feedback["NEGATIVE"] = "NEGATIVE";
    Feedback["VERY_NEGATIVE"] = "VERY_NEGATIVE";
})(Feedback || (Feedback = {}));
export const MemoryStateValues = [
    'active',
    'paused',
    'archived',
    'deleted',
];
export var MemoryAddEvent;
(function (MemoryAddEvent) {
    MemoryAddEvent["ADD"] = "ADD";
    MemoryAddEvent["UPDATE"] = "UPDATE";
    MemoryAddEvent["DELETE"] = "DELETE";
    MemoryAddEvent["NOOP"] = "NOOP";
})(MemoryAddEvent || (MemoryAddEvent = {}));
var WebhookEvent;
(function (WebhookEvent) {
    WebhookEvent["MEMORY_ADDED"] = "memory_add";
    WebhookEvent["MEMORY_UPDATED"] = "memory_update";
    WebhookEvent["MEMORY_DELETED"] = "memory_delete";
})(WebhookEvent || (WebhookEvent = {}));
//# sourceMappingURL=mem0.types.js.map