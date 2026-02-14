#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { SequentialThinkingServer, SEQUENTIAL_THINKING_TOOL } from "./sequential-thinking-server.js";
const server = new Server({
    name: "sequential-thinking-server",
    version: "0.2.0",
}, {
    capabilities: {
        tools: {},
    },
});
const thinkingServer = new SequentialThinkingServer();
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [SEQUENTIAL_THINKING_TOOL],
}));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "sequentialthinking") {
        return thinkingServer.processThought(request.params.arguments);
    }
    return {
        content: [{
                type: "text",
                text: `Unknown tool: ${request.params.name}`
            }],
        isError: true
    };
});
async function runServer() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Sequential Thinking MCP Server running on stdio");
}
runServer().catch((error) => {
    console.error("Fatal error running server:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map