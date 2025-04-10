package com.obapps.schoolchatbot.assistants.services;

import java.util.List;

public class JustInTimeDocumentLookup {

  private final AzureSearchClient searchClient;
  private final IStandaloneModelClient summarizer;
  private final DocumentChunkFilter chunkFilter;

  public JustInTimeDocumentLookup() {
    this(null, null, null);
  }

  /**
   * Constructor for JustInTimeDocumentLookup.
   *
   * @param searchClient The AzureSearchClient instance to use for searching documents.
   * @param summarizer The IStandaloneModelClient instance to use for summarizing documents.
   * @param chunkFilter The DocumentChunkFilter instance to use for filtering document chunks.
   */
  public JustInTimeDocumentLookup(
    AzureSearchClient searchClient,
    IStandaloneModelClient summarizer,
    DocumentChunkFilter chunkFilter
  ) {
    this.searchClient = searchClient == null
      ? new AzureSearchClient()
      : searchClient;
    this.summarizer = summarizer == null
      ? new StandaloneModelClient()
      : summarizer;
    this.chunkFilter = chunkFilter == null
      ? new DocumentChunkFilter()
      : chunkFilter;
  }

  public String summarizeDocument(String query) {
    return summarizeDocument(query, AzureSearchClient.ScopeType.All);
  }

  public String summarizeDocument(
    String query,
    AzureSearchClient.ScopeType scope
  ) {
    List<String> chunks = searchClient.hybridSearch(query, 15, scope); // pull top 15
    List<String> filtered = chunkFilter.filterTopDocumentChunks(chunks, 5); // use best 5

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
      "You are assisting in document analysis for compliance and insights.\n\n" +
      "Given a set of document excerpts, your task is to:\n\n" +
      "1. Extract key points, deadlines, and responsible actors.\n" +
      "2. Return a short summary paragraph.\n" +
      "3. Indicate which chunks were most relevant.\n\n" +
      "** Example Input **\n\n" +
      "[0] The document outlines the following steps...\n" +
      "[1] The coordinator shall review the document within 5 days.\n" +
      "[2] The team may request additional information...\n\n" +
      "--- START CHUNKS ---\n" +
      "%s\n" +
      "--- END CHUNKS ---\n\n" +
      "Summary:\n" +
      "".formatted(chunkBlock);

    return summarizer.call(summarizationPrompt);
  }
}
