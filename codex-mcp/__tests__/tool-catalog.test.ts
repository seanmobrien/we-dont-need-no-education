import {
  helperToolIsCallable,
  listToolsForToolset,
  namespaceNamesForToolset,
  remoteToolIsCallable,
  unprefixedToolName,
  upstreamRemoteToolName,
} from "../src/scripts/tool-catalog";

describe("tool catalog", () => {
  it("strips namespace prefixes from tool names", () => {
    expect(unprefixedToolName("compliance_theater_search_policy")).toBe("policy");
    expect(unprefixedToolName("compliance-theater-case-workspace_append_task")).toBe("append_task");
    expect(unprefixedToolName("graph_read")).toBe("graph_read");
  });

  it("maps aliased remote tool names for scoped toolsets", () => {
    expect(upstreamRemoteToolName("search", "policy")).toBe("searchPolicyStore");
    expect(upstreamRemoteToolName("todo", "toggle")).toBe("toggleTodo");
    expect(upstreamRemoteToolName("case-workspace", "append_task")).toBe("appendWorkspaceTask");
  });

  it("limits remote tools by toolset", () => {
    expect(remoteToolIsCallable("default", "policy")).toBe(false);
    expect(remoteToolIsCallable("search", "policy")).toBe(true);
    expect(remoteToolIsCallable("todo", "toggle")).toBe(true);
    expect(remoteToolIsCallable("case-files", "get")).toBe(false);
    expect(remoteToolIsCallable("memory", "search")).toBe(false);
  });

  it("limits helper tools by toolset", () => {
    expect(helperToolIsCallable("search", "graph_embed")).toBe(true);
    expect(helperToolIsCallable("utils", "auth")).toBe(true);
    expect(helperToolIsCallable("default", "read_case_file")).toBe(false);
    expect(helperToolIsCallable("case-files", "get")).toBe(true);
  });

  it("returns prefixed tools for scoped toolsets", () => {
    const searchTools = listToolsForToolset("search");
    const toolNames = searchTools.map((tool) => tool.name);

    expect(toolNames).toContain("compliance_theater_search_policy");
    expect(toolNames).toContain("compliance_theater_search_graph_embed");
    expect(toolNames).not.toContain("compliance_theater_search_read_case_file");
  });

  it("returns all namespace names only for the all toolset", () => {
    expect(namespaceNamesForToolset("all")).toHaveLength(7);
    expect(namespaceNamesForToolset("search")).toEqual(["compliance_theater_search"]);
  });
});