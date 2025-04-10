package com.obapps.schoolchatbot.assistants.services;

import java.util.List;

public class JustInTimePolicyLookup {

  private final AzurePolicySearchClient searchClient;
  private final IStandaloneModelClient summarizer; // Your GPT-3.5 wrapper
  private final PolicyChunkFilter chunkFilter; // Your GPT-3.5 wrapper

  public JustInTimePolicyLookup() {
    this(null, null, null);
  }

  /**
   * Constructor for JustInTimePolicyLookup.
   *
   * @param searchClient The AzurePolicySearchClient instance to use for searching policies.
   * @param summarizer The IStandaloneModelClient instance to use for summarizing policies.
   * @param chunkFilter The PolicyChunkFilter instance to use for filtering policy chunks.
   */
  public JustInTimePolicyLookup(
    AzurePolicySearchClient searchClient,
    IStandaloneModelClient summarizer,
    PolicyChunkFilter chunkFilter
  ) {
    this.searchClient = searchClient == null
      ? new AzurePolicySearchClient()
      : searchClient;
    this.summarizer = summarizer == null
      ? new StandaloneModelClient()
      : summarizer;
    this.chunkFilter = chunkFilter == null
      ? new PolicyChunkFilter()
      : chunkFilter;
  }

  public String summarizePolicy(String query) {
    return summarizePolicy(query, AzurePolicySearchClient.ScopeType.All);
  }

  public String summarizePolicy(
    String query,
    AzurePolicySearchClient.ScopeType policyType
  ) {
    List<String> chunks = searchClient.hybridSearch(query, 15, policyType); // pull top 15
    List<String> filtered = chunkFilter.filterTopPolicyChunks(chunks, 5); // use best 5

    StringBuilder chunkBlock = new StringBuilder();
    for (int i = 0; i < filtered.size(); i++) {
      chunkBlock
        .append("[")
        .append(i)
        .append("] ")
        .append(filtered.get(i))
        .append("\n");
    }

    String summarizationPrompt =
      "You are assisting in legal policy analysis for school compliance.\n\n" +
      "Given a set of board policy excerpts, your task is to:\n\n" +
      "1. Extract deadlines, responsible actors, and mandatory actions.\n" +
      "2. Return a short summary paragraph.\n" +
      "3. Indicate which chunks were most relevant.\n\n" +
      "** Example Input **\n\n" +
      "[0] The school must take reasonable steps...\n" +
      "[1] The Title IX coordinator shall begin investigation within 10 calendar days.\n" +
      "[2] The student may request accommodations...\n\n" +
      "--- START CHUNKS ---\n" +
      "%s\n" +
      "--- END CHUNKS ---\n\n" +
      "Summary:\n" +
      "".formatted(chunkBlock);

    String summary = summarizer.call(summarizationPrompt);
    return summary;
  }
}
