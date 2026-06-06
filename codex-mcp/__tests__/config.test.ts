import { normalizeServerUrl } from "../src/scripts/config";

describe("plugin config", () => {
  it("appends the canonical MCP SSE path when SERVER_URL is only an origin", () => {
    expect(normalizeServerUrl("http://localhost:3000"))
      .toBe("http://localhost:3000/api/ai/tools/sse");
  });

  it("preserves explicit SERVER_URL paths", () => {
    expect(normalizeServerUrl("http://localhost:3000/custom/sse"))
      .toBe("http://localhost:3000/custom/sse");
  });
});
