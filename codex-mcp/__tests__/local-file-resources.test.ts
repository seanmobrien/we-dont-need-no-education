import { listLocalFileResources, readLocalFileResource } from "../src/scripts/local-file-resources";

describe("local MCP file resources", () => {
  it("lists AGENTS.md and bundled skills under MCP virtual paths", async () => {
    const resources = await listLocalFileResources();
    const names = resources.map((resource) => resource.name);

    expect(names).toContain("./AGENTS.md");
    expect(names).toContain(".agents/skills/compliance-theater/SKILL.md");
    expect(names).toContain(".agents/skills/compliance-theater-workspace/references/workspace-rules.md");
    expect(resources.find((resource) => resource.name === "./AGENTS.md")).toMatchObject({
      uri: "file://./AGENTS.md",
      mimeType: "text/markdown",
    });
  });

  it("reads resources by MCP URI and relative virtual path", async () => {
    const agents = await readLocalFileResource("file://./AGENTS.md");
    const skill = await readLocalFileResource(".agents/skills/compliance-theater/SKILL.md");

    expect(agents?.contents?.[0]).toMatchObject({
      uri: "file://./AGENTS.md",
      mimeType: "text/markdown",
    });
    expect(agents?.contents?.[0]?.text).toContain(".agents/skills/compliance-theater/SKILL.md");
    expect(skill?.contents?.[0]?.text).toContain("# Compliance Theater");
  });
});