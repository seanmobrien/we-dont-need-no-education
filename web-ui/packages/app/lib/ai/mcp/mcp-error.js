import { McpError } from '@modelcontextprotocol/sdk/types.js';
export class MCPError extends McpError {
    constructor(optionsOrCode, message, data) {
        let options;
        if (typeof optionsOrCode === 'number') {
            options = { code: optionsOrCode, message, data };
        }
        else {
            options = optionsOrCode;
        }
        super(options.code, options.message ?? 'An unexpected error occurred.', options.data);
    }
}
//# sourceMappingURL=mcp-error.js.map