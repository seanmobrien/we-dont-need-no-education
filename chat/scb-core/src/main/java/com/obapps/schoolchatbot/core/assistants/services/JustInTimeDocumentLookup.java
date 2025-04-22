package com.obapps.schoolchatbot.core.assistants.services;

import com.obapps.schoolchatbot.core.assistants.types.IDocumentContentSource;

/**
 * The JustInTimeDocumentLookup class is responsible for performing just-in-time
 * document lookups and summarizations using Azure Search and a summarization model.
 * It extends the JustInTimeLookupTool class with a specific scope type of
 * AzureSearchClient.ScopeType.
 */
public class JustInTimeDocumentLookup
  extends JustInTimeLookupTool<AzureSearchClient.ScopeType> {

  /**
   * Default constructor for JustInTimeDocumentLookup.
   * Initializes the class with default instances of AzureSearchClient,
   * IStandaloneModelClient, and DocumentChunkFilter.
   */
  public JustInTimeDocumentLookup(IDocumentContentSource documentSource) {
    this(
      documentSource,
      new AzureSearchClient(),
      new StandaloneModelClient(),
      new DocumentChunkFilter()
    );
  }

  /**
   * Constructor for JustInTimeDocumentLookup.
   *
   * @param documentSource The IDocumentContentSource instance to use for document retrieval.
   * @param searchClient The AzureSearchClient instance to use for searching documents.
   *                     If null, a default instance of AzureSearchClient is created.
   * @param summarizer   The IStandaloneModelClient instance to use for summarizing documents.
   *                     If null, a default instance of StandaloneModelClient is created.
   * @param chunkFilter  The DocumentChunkFilter instance to use for filtering document chunks.
   *                     If null, a default instance of DocumentChunkFilter is created.
   */
  public JustInTimeDocumentLookup(
    IDocumentContentSource documentSource,
    AzureSearchClient searchClient,
    IStandaloneModelClient summarizer,
    DocumentChunkFilter chunkFilter
  ) {
    super(
      documentSource,
      searchClient == null ? new AzureSearchClient() : searchClient,
      summarizer == null ? new StandaloneModelClient() : summarizer,
      chunkFilter == null ? new DocumentChunkFilter() : chunkFilter
    );
  }

  /**
   * Summarizes a document based on the provided query.
   * Uses the default scope type of AzureSearchClient.ScopeType.All.
   *
   * @param query The query string used to search and summarize the document.
   * @return A summarized version of the document as a string.
   */
  public String summarizeDocument(String query) {
    return this.summarizeDocument(query, AzureSearchClient.ScopeType.All);
  }

  /**
   * Summarizes a document based on the provided query and scope.
   *
   * @param query The query string used to search and summarize the document.
   * @param scope The scope type to use for the document search.
   * @return A summarized version of the document as a string.
   */
  public String summarizeDocument(
    String query,
    AzureSearchClient.ScopeType scope
  ) {
    return super.justInTimeLookup(query, scope, true);
  }
}
