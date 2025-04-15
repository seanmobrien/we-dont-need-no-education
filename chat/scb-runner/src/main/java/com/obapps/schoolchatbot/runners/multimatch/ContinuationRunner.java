package com.obapps.schoolchatbot.runners.multimatch;

public class ContinuationRunner {

  private final LLMBatchingManager batchingManager;
  private final MatchContinuationTool continuationTool;

  public LLMContinuationRunner(
    LLMBatchingManager batchingManager,
    MatchContinuationTool continuationTool
  ) {
    this.batchingManager = batchingManager;
    this.continuationTool = continuationTool;
  }

  public List<String> getFullResults(String queryId) {
    List<String> allResults = new ArrayList<>();
    while (batchingManager.hasMore(queryId)) {
      List<String> batch = continuationTool.continueMatchRetrieval(queryId);
      allResults.addAll(batch);
    }
    return allResults;
  }
}
