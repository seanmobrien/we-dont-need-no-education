import { graphEmbedTool, type GraphToolCaller } from "../src/scripts/graph-embed";
import type { QueryVectorFetcher } from "../src/scripts/vector-params";

function graphReadResult(
  matchedCount: number,
  matchedNodes: Array<{ elementId: string; text?: string | null; properties?: Record<string, unknown> }>
) {
  return {
    structuredContent: {
      result: {
        records: [{ matchedCount, matchedNodes }]
      }
    }
  };
}

function graphWriteResult(updatedCount: number) {
  return {
    structuredContent: {
      result: {
        records: [{ updatedCount }]
      }
    }
  };
}

describe("graphEmbedTool", () => {
  it("updates text and vector when textValue is provided", async () => {
    const callGraphTool = jest.fn<ReturnType<GraphToolCaller>, Parameters<GraphToolCaller>>()
      .mockResolvedValueOnce(graphReadResult(1, [{ elementId: "node-1", text: "old content" }]))
      .mockResolvedValueOnce(graphWriteResult(1));
    const generate = jest.fn<ReturnType<QueryVectorFetcher>, Parameters<QueryVectorFetcher>>()
      .mockResolvedValue({ vectors: [0.1, 0.2] });

    const result = await graphEmbedTool({
      nodeType: "case_file_chunk",
      idColumnName: "chunkId",
      idValue: "abc",
      textValue: "new content"
    }, callGraphTool, generate);

    expect(generate).toHaveBeenCalledWith("new content", "small");
    expect(callGraphTool).toHaveBeenNthCalledWith(1, "graph_read", {
      query: [
        "MATCH (n:`case_file_chunk`)",
        "WHERE n.`chunkId` = $idValue",
        "RETURN count(n) AS matchedCount, collect({elementId: elementId(n), text: n.`content`, properties: properties(n)}) AS matchedNodes"
      ].join("\n"),
      params: { idValue: "abc" }
    });
    expect(callGraphTool).toHaveBeenNthCalledWith(2, "graph_write", {
      query: [
        "UNWIND $updates AS update",
        "MATCH (n)",
        "WHERE elementId(n) = update.elementId",
        "SET n.`content` = update.text, n.`embedding` = update.vector",
        "RETURN count(n) AS updatedCount"
      ].join("\n"),
      params: {
        updates: [{ elementId: "node-1", text: "new content", vector: [0.1, 0.2] }]
      }
    });
    expect(result).toMatchObject({
      action: "graph_embed",
      matchedCount: 1,
      updatedCount: 1,
      textUpdated: true,
      embeddingCalls: 1
    });
  });

  it("uses existing text column value when textValue is omitted", async () => {
    const callGraphTool = jest.fn<ReturnType<GraphToolCaller>, Parameters<GraphToolCaller>>()
      .mockResolvedValueOnce(graphReadResult(1, [{ elementId: "node-2", text: "existing content" }]))
      .mockResolvedValueOnce(graphWriteResult(1));
    const generate = jest.fn<ReturnType<QueryVectorFetcher>, Parameters<QueryVectorFetcher>>()
      .mockResolvedValue({ embedding: [0.3, 0.4] });

    await graphEmbedTool({
      id_column_name: "unitId",
      id_value: 42,
      text_column_name: "body",
      vector_column_name: "bodyEmbedding",
      size: "large"
    }, callGraphTool, generate);

    expect(generate).toHaveBeenCalledWith("existing content", "large");
    expect(callGraphTool.mock.calls[1][1]).toEqual({
      query: [
        "UNWIND $updates AS update",
        "MATCH (n)",
        "WHERE elementId(n) = update.elementId",
        "SET n.`bodyEmbedding` = update.vector",
        "RETURN count(n) AS updatedCount"
      ].join("\n"),
      params: {
        updates: [{ elementId: "node-2", vector: [0.3, 0.4] }]
      }
    });
  });

  it("appends other_fields values to the embedding text", async () => {
    const callGraphTool = jest.fn<ReturnType<GraphToolCaller>, Parameters<GraphToolCaller>>()
      .mockResolvedValueOnce(graphReadResult(1, [{
        elementId: "node-3",
        text: "existing content",
        properties: {
          title: "Formal complaint",
          tags: ["urgent", "student"]
        }
      }]))
      .mockResolvedValueOnce(graphWriteResult(1));
    const generate = jest.fn<ReturnType<QueryVectorFetcher>, Parameters<QueryVectorFetcher>>()
      .mockResolvedValue({ vector: [0.5, 0.6] });

    await graphEmbedTool({
      idColumnName: "unitId",
      idValue: 7,
      other_fields: ["title", "tags"]
    }, callGraphTool, generate);

    expect(generate).toHaveBeenCalledWith(
      "existing content\n\ntitle: Formal complaint\n\ntags: [\"urgent\",\"student\"]",
      "small"
    );
  });

  it("accepts a single otherFields string alias", async () => {
    const callGraphTool = jest.fn<ReturnType<GraphToolCaller>, Parameters<GraphToolCaller>>()
      .mockResolvedValueOnce(graphReadResult(1, [{
        elementId: "node-4",
        text: "existing content",
        properties: { title: "Case note" }
      }]))
      .mockResolvedValueOnce(graphWriteResult(1));
    const generate = jest.fn<ReturnType<QueryVectorFetcher>, Parameters<QueryVectorFetcher>>()
      .mockResolvedValue({ vector: [0.7, 0.8] });

    await graphEmbedTool({
      idColumnName: "unitId",
      idValue: 8,
      otherFields: "title"
    }, callGraphTool, generate);

    expect(generate).toHaveBeenCalledWith(
      "existing content\n\ntitle: Case note",
      "small"
    );
  });

  it("blocks multiple matches unless updateMultiple is true", async () => {
    const callGraphTool = jest.fn<ReturnType<GraphToolCaller>, Parameters<GraphToolCaller>>()
      .mockResolvedValueOnce(graphReadResult(2, [
        { elementId: "node-1", text: "one" },
        { elementId: "node-2", text: "two" }
      ]));
    const generate = jest.fn<ReturnType<QueryVectorFetcher>, Parameters<QueryVectorFetcher>>();

    await expect(graphEmbedTool({
      idColumnName: "caseId",
      idValue: "shared"
    }, callGraphTool, generate)).rejects.toThrow("expected exactly one node");

    expect(generate).not.toHaveBeenCalled();
    expect(callGraphTool).toHaveBeenCalledTimes(1);
  });

  it("allows multiple matches and deduplicates identical source text", async () => {
    const callGraphTool = jest.fn<ReturnType<GraphToolCaller>, Parameters<GraphToolCaller>>()
      .mockResolvedValueOnce(graphReadResult(3, [
        { elementId: "node-1", text: "same" },
        { elementId: "node-2", text: "same" },
        { elementId: "node-3", text: "different" }
      ]))
      .mockResolvedValueOnce(graphWriteResult(3));
    const generate = jest.fn<ReturnType<QueryVectorFetcher>, Parameters<QueryVectorFetcher>>()
      .mockResolvedValueOnce({ vector: [1] })
      .mockResolvedValueOnce({ vector: [2] });

    const result = await graphEmbedTool({
      idColumnName: "caseId",
      idValue: "shared",
      update_multiple: true
    }, callGraphTool, generate);

    expect(generate).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      matchedCount: 3,
      updatedCount: 3,
      embeddingCalls: 2
    });
    expect(callGraphTool.mock.calls[1][1].params.updates).toEqual([
      { elementId: "node-1", vector: [1] },
      { elementId: "node-2", vector: [1] },
      { elementId: "node-3", vector: [2] }
    ]);
  });
});
