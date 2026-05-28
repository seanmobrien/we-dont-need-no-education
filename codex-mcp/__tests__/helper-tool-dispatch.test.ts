jest.mock("../src/scripts/app-tools", () => ({
  amendCaseFileTool: jest.fn(),
  callApiTool: jest.fn(),
  callMemoryTool: jest.fn(),
  createGenerateQueryVectors: jest.fn(),
  getCaseFileTool: jest.fn(),
  manageCaseFileEmbeddingsTool: jest.fn(),
  readCaseFileTool: jest.fn(),
}));

jest.mock("../src/scripts/auth", () => ({
  authStatusSummary: jest.fn(),
  loginAndSummarizeStatus: jest.fn(),
}));

jest.mock("../src/scripts/graph-embed", () => ({
  graphEmbedTool: jest.fn(),
}));

jest.mock("../src/scripts/vector-params", () => ({
  materializeGraphVectorParams: jest.fn(),
}));

import {
  amendCaseFileTool,
  callMemoryTool,
  createGenerateQueryVectors,
} from "../src/scripts/app-tools";
import { authStatusSummary } from "../src/scripts/auth";
import { graphEmbedTool } from "../src/scripts/graph-embed";
import { dispatchHelperTool, type HelperToolDispatchDeps } from "../src/scripts/helper-tool-dispatch";
import { materializeGraphVectorParams } from "../src/scripts/vector-params";

function createDeps(overrides: Partial<HelperToolDispatchDeps> = {}): HelperToolDispatchDeps {
  return {
    callNeo4jGraphTool: jest.fn().mockResolvedValue({ graph: true }),
    clearCachedToken: jest.fn().mockResolvedValue("cleared"),
    formatAbilities: jest.fn().mockReturnValue("abilities"),
    formatResourceDirectory: jest.fn().mockReturnValue("resources"),
    freshTokenAfterBadRequest: jest.fn().mockResolvedValue({ access_token: "token", token_endpoint: "token" } as never),
    listResourceTemplates: jest.fn().mockResolvedValue([{ uriTemplate: "template://1" }]),
    listResources: jest.fn().mockResolvedValue([{ uri: "resource://1" }]),
    listTools: jest.fn().mockReturnValue([{ name: "auth" }]),
    remoteRequest: jest.fn().mockResolvedValue({ ok: true }),
    toolset: "all",
    ...overrides,
  };
}

describe("dispatchHelperTool", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("dispatches memory tools in the memory toolset", async () => {
    const deps = createDeps({ toolset: "memory" });
    jest.mocked(callMemoryTool).mockResolvedValue({ items: [1] });

    const result = await dispatchHelperTool("search", { query: "bias" }, deps);

    expect(callMemoryTool).toHaveBeenCalledWith("search", { query: "bias" }, deps.freshTokenAfterBadRequest);
    expect(result).toMatchObject({
      result: {
        structuredContent: {
          result: { items: [1] }
        }
      }
    });
  });

  it("dispatches graph read tools after materializing vector params", async () => {
    const deps = createDeps();
    jest.mocked(createGenerateQueryVectors).mockReturnValue(jest.fn());
    jest.mocked(materializeGraphVectorParams).mockResolvedValue({ query: "RETURN $vector", params: { vector: [1, 2] } });

    await dispatchHelperTool("graph_read", { vectorParams: { vector: "bias" } }, deps);

    expect(materializeGraphVectorParams).toHaveBeenCalledWith(
      { vectorParams: { vector: "bias" } },
      expect.any(Function)
    );
    expect(deps.callNeo4jGraphTool).toHaveBeenCalledWith("graph_read", { query: "RETURN $vector", params: { vector: [1, 2] } });
  });

  it("dispatches graph_embed through the dedicated helper", async () => {
    const deps = createDeps();
    jest.mocked(createGenerateQueryVectors).mockReturnValue(jest.fn());
    jest.mocked(graphEmbedTool).mockResolvedValue({ updatedCount: 1 });

    const result = await dispatchHelperTool("graph_embed", { idValue: "1" }, deps);

    expect(graphEmbedTool).toHaveBeenCalledWith({ idValue: "1" }, deps.callNeo4jGraphTool, expect.any(Function));
    expect(result).toMatchObject({
      result: {
        structuredContent: {
          result: { updatedCount: 1 }
        }
      }
    });
  });

  it("formats ability listings through injected directory helpers", async () => {
    const deps = createDeps({ toolset: "utils" });

    const result = await dispatchHelperTool("list", { type: "abilities" }, deps);

    expect(deps.listTools).toHaveBeenCalled();
    expect(deps.listResources).toHaveBeenCalled();
    expect(deps.listResourceTemplates).toHaveBeenCalled();
    expect(deps.formatAbilities).toHaveBeenCalledWith(
      [{ name: "auth" }],
      [{ uri: "resource://1" }],
      [{ uriTemplate: "template://1" }]
    );
    expect(result).toEqual({
      result: {
        content: [{ type: "text", text: "abilities" }]
      }
    });
  });

  it("returns an auth validation error for unsupported actions", async () => {
    const deps = createDeps();

    const result = await dispatchHelperTool("auth", { action: "nope" }, deps);

    expect(result).toEqual({
      error: {
        code: -32602,
        message: "action must be one of: status, clear-cache, login"
      }
    });
  });

  it("dispatches auth status through the auth helper", async () => {
    const deps = createDeps();
    jest.mocked(authStatusSummary).mockResolvedValue("signed in");

    const result = await dispatchHelperTool("auth", { action: "status" }, deps);

    expect(authStatusSummary).toHaveBeenCalled();
    expect(result).toEqual({
      result: {
        content: [{ type: "text", text: "signed in" }]
      }
    });
  });

  it("dispatches amend calls to the case-file helper", async () => {
    const deps = createDeps();
    jest.mocked(amendCaseFileTool).mockResolvedValue({ ok: true });

    const result = await dispatchHelperTool("amend", { update: { targetCaseFileId: 1 } }, deps);

    expect(amendCaseFileTool).toHaveBeenCalledWith({ update: { targetCaseFileId: 1 } }, deps.remoteRequest);
    expect(result).toMatchObject({
      result: {
        structuredContent: {
          result: { ok: true }
        }
      }
    });
  });
});