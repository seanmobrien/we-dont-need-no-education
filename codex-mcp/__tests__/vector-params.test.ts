import {
  createCachedQueryVectorGenerator,
  createQueryVectorCache,
  materializeGraphVectorParams,
  queryVectorFromEmbeddingResult,
  type QueryVectorFetcher,
} from "../src/scripts/vector-params";

describe("graph vector params", () => {
  it("materializes top-level vectorParams into Cypher params", async () => {
    const fetcher = jest.fn<ReturnType<QueryVectorFetcher>, Parameters<QueryVectorFetcher>>()
      .mockResolvedValue({ vectors: [0.1, 0.2, 0.3] });

    const result = await materializeGraphVectorParams({
      query: "RETURN $queryVector",
      params: { limit: 5 },
      vectorParams: {
        queryVector: { text: "bias", modelSize: "small" }
      }
    }, fetcher);

    expect(fetcher).toHaveBeenCalledWith("bias", "small");
    expect(result).toEqual({
      query: "RETURN $queryVector",
      params: {
        limit: 5,
        queryVector: [0.1, 0.2, 0.3]
      }
    });
  });

  it("materializes inline explicit $embed params and removes nested control params", async () => {
    const fetcher = jest.fn<ReturnType<QueryVectorFetcher>, Parameters<QueryVectorFetcher>>()
      .mockResolvedValue({ embedding: [1, 2, 3] });

    const result = await materializeGraphVectorParams({
      query: "RETURN $queryVector",
      params: {
        queryVector: { $embed: "racial bias", modelSize: "large" },
        __vectorParams: { otherVector: "discipline" }
      }
    }, fetcher);

    expect(fetcher).toHaveBeenNthCalledWith(1, "discipline", "small");
    expect(fetcher).toHaveBeenNthCalledWith(2, "racial bias", "large");
    expect(result.params).toEqual({
      queryVector: [1, 2, 3],
      otherVector: [1, 2, 3]
    });
  });

  it("leaves ordinary object params alone without an explicit inline marker", async () => {
    const fetcher = jest.fn<ReturnType<QueryVectorFetcher>, Parameters<QueryVectorFetcher>>();
    const args = {
      query: "RETURN $filter",
      params: {
        filter: { text: "not an embedding request" }
      }
    };

    await expect(materializeGraphVectorParams(args, fetcher)).resolves.toBe(args);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects vectorParams that collide with existing non-vector params", async () => {
    const fetcher = jest.fn<ReturnType<QueryVectorFetcher>, Parameters<QueryVectorFetcher>>();

    await expect(materializeGraphVectorParams({
      query: "RETURN $queryVector",
      params: { queryVector: [1, 2, 3] },
      vectorParams: { queryVector: "bias" }
    }, fetcher)).rejects.toThrow("collides with an existing non-vector Cypher parameter");
  });

  it("validates embedding responses before injecting them", () => {
    expect(queryVectorFromEmbeddingResult({ vector: [1, 2] }, "test")).toEqual([1, 2]);
    expect(() => queryVectorFromEmbeddingResult({ vector: [1, Number.NaN] }, "test"))
      .toThrow("did not return a numeric query vector");
  });
});

describe("query vector cache", () => {
  it("deduplicates equivalent in-flight requests by trimmed text and model size", async () => {
    const cache = createQueryVectorCache(10, 60_000);
    const fetcher = jest.fn<ReturnType<QueryVectorFetcher>, Parameters<QueryVectorFetcher>>()
      .mockResolvedValue({ vectors: [0.4, 0.5] });
    const generate = createCachedQueryVectorGenerator(fetcher, cache);

    const [left, right] = await Promise.all([
      generate(" bias ", "small"),
      generate("bias", "small")
    ]);

    expect(left).toEqual({ vectors: [0.4, 0.5] });
    expect(right).toEqual({ vectors: [0.4, 0.5] });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith("bias", "small");
  });

  it("evicts rejected embedding requests so a later retry can succeed", async () => {
    const cache = createQueryVectorCache(10, 60_000);
    const fetcher = jest.fn<ReturnType<QueryVectorFetcher>, Parameters<QueryVectorFetcher>>()
      .mockRejectedValueOnce(new Error("upstream failed"))
      .mockResolvedValueOnce({ vectors: [0.7] });
    const generate = createCachedQueryVectorGenerator(fetcher, cache);

    await expect(generate("bias", "small")).rejects.toThrow("upstream failed");
    await expect(generate("bias", "small")).resolves.toEqual({ vectors: [0.7] });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
