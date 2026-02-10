import { McpError } from '@modelcontextprotocol/sdk/types.js';
import { MCPErrorOptions } from './types';

export class MCPError extends McpError {
    constructor(options: MCPErrorOptions)
    constructor(code: number, message: string, data?: unknown)
    constructor(optionsOrCode: number | MCPErrorOptions, message?: string, data?: unknown) {
        let options: MCPErrorOptions;
        if (typeof optionsOrCode === 'number') {
            options = { code: optionsOrCode, message, data };
        } else {
            options = optionsOrCode;
        }
        // super sets this.name for us...
        super(options.code, options.message ?? 'An unexpected error occurred.', options.data);
    }
}
