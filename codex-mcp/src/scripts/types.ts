import type { ChildProcessWithoutNullStreams } from "node:child_process";
import type { AppSession, SseConnection, Token } from "./runtime-utils";

export type AnyRecord = Record<string, any>;
export type RpcId = string | number | null;
export type ToolArgs = Record<string, any>;

export type JsonRpcMessage = {
  jsonrpc?: string;
  id?: RpcId;
  method: string;
  params?: ToolArgs;
  result?: AnyRecord;
  error?: { code?: number; message: string };
};

export type JsonToolResult = {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: { result: unknown };
};

export type ToolDefinition = {
  name: string;
  description?: string;
  inputSchema?: AnyRecord;
  outputSchema?: AnyRecord;
  annotations?: AnyRecord;
};

export type OpenAiFunctionToolDefinition = {
  type: "function";
  name: string;
  description?: string;
  parameters: AnyRecord;
};

export type OpenAiNamespaceToolDefinition = {
  type: "namespace";
  name: ServerName;
  description: string;
  tools: OpenAiFunctionToolDefinition[];
};

export type OpenAiToolSearchToolDefinition = {
  type: "tool_search";
};

export type OpenAiToolDefinition =
  | OpenAiToolSearchToolDefinition
  | OpenAiNamespaceToolDefinition;

export type Toolset = "all" | "default" | "memory" | "utils" | "todo" | "case-workspace" | "search" | "case-files";

export type ServerName =
  | "compliance_theater"
  | "compliance_theater_memory"
  | "compliance_theater_utils"
  | "compliance_theater_todo"
  | "compliance_theater_case_workspace"
  | "compliance_theater_search"
  | "compliance_theater_case_files";

export type OAuthClient = {
  client_id?: string;
  client_secret?: string;
};

export type OAuthMetadata = AnyRecord & {
  issuer?: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
  registration_endpoint?: string;
  device_authorization_endpoint?: string;
  grant_types_supported?: string[];
  token_endpoint_auth_methods_supported?: string[];
};

export type OAuthToken = Token & {
  access_token: string;
  metadata?: OAuthMetadata;
};

export type CachedToken = OAuthToken & {
  metadata?: OAuthMetadata;
  app_session?: AppSession;
};

export type TokenInfo = {
  token?: string;
  source?: string;
  cached?: CachedToken;
};

export type JsonResponse = {
  response: Response;
  body: AnyRecord;
  url: string;
};

export type FailedResult = { error: Error };
export type SessionResult = JsonResponse | FailedResult;

export type RemoteConnection = SseConnection & {
  accessToken: string;
  appSession?: AppSession;
  sessionCookie?: string;
  nextId: number;
};

export type StdioMcpConnection = {
  child: ChildProcessWithoutNullStreams;
  commandLabel: string;
  outputFraming: "content-length" | "newline";
  nextId: number;
  buffer: Buffer;
  pending: Map<number, {
    resolve: (value: AnyRecord) => void;
    reject: (error: Error) => void;
    timer: NodeJS.Timeout;
  }>;
  queue: Promise<AnyRecord>;
};

export type Neo4jSettings = {
  URI: string;
  USERNAME: string;
  PASSWORD: string;
  DATABASE: string;
};

export type CachedNeo4jSettings = Neo4jSettings & {
  expires_at: number;
  expires_at_iso?: string;
};

export type ErrorWithCode = Error & { code?: string };

export type EmbeddingAction = "read" | "embed" | "embed-if-missing" | "query-vectors";
