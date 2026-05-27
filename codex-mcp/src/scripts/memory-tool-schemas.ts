import type { ToolDefinition } from "./types";

export const memoryTools: ToolDefinition[] = [
  {
    name: "list",
    description: "List memories for the authenticated Compliance Theater app session.",
    inputSchema: {
      type: "object",
      properties: {
        app_id: { type: "string", description: "Optional memory app UUID filter." },
        from_date: { type: "integer", description: "Only return memories created after this Unix timestamp." },
        to_date: { type: "integer", description: "Only return memories created before this Unix timestamp." },
        categories: { type: "string", description: "Optional category filter." },
        search_query: { type: "string", description: "Optional search text filter." },
        sort_column: { type: "string", description: "Sort by memory, categories, app_name, or created_at." },
        sort_direction: { type: "string", enum: ["asc", "desc"], description: "Sort order." },
        page: { type: "integer", minimum: 1, default: 1, description: "Page number." },
        size: { type: "integer", minimum: 1, maximum: 100, default: 50, description: "Page size." }
      },
      additionalProperties: false
    }
  },
  {
    name: "insert",
    description: "Create a memory for the authenticated Compliance Theater app session.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Memory text to store." },
        metadata: { type: "object", additionalProperties: true, description: "Optional memory metadata." },
        infer: { type: "boolean", default: true, description: "Whether the memory service should infer memories." },
        app: { type: "string", default: "openmemory", description: "Memory app name." }
      },
      required: ["text"],
      additionalProperties: false
    }
  },
  {
    name: "categories",
    description: "Get the available memory categories for the authenticated Compliance Theater app session.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "get",
    description: "Get a memory by its ID.",
    inputSchema: {
      type: "object",
      properties: { memory_id: { type: "string", description: "Memory UUID." } },
      required: ["memory_id"],
      additionalProperties: false
    }
  },
  {
    name: "update",
    description: "Update a memory by its ID.",
    inputSchema: {
      type: "object",
      properties: {
        memory_id: { type: "string", description: "Memory UUID." },
        memory_content: { type: "string", description: "Replacement memory content." }
      },
      required: ["memory_id", "memory_content"],
      additionalProperties: false
    }
  },
  {
    name: "search",
    description: "Search memories for the authenticated Compliance Theater app session.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Memory search query." },
        numberOfHits: { type: "integer", minimum: 1, default: 10, description: "Maximum search hits." },
        page: { type: "integer", minimum: 1, default: 1, description: "Result page." },
        filters: { type: "object", additionalProperties: true, description: "Optional memory search filters." }
      },
      required: ["query"],
      additionalProperties: false
    }
  },
  {
    name: "related",
    description: "List memories related to a source memory ID.",
    inputSchema: {
      type: "object",
      properties: {
        memory_id: { type: "string", description: "Memory UUID." },
        page: { type: "integer", minimum: 1, default: 1, description: "Page number." },
        size: { type: "integer", minimum: 1, maximum: 100, default: 50, description: "Page size." }
      },
      required: ["memory_id"],
      additionalProperties: false
    }
  }
];
