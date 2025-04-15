package com.obapps.schoolchatbot.core.assistants.services;

public class JustInTimePolicyLookup
  extends JustInTimeLookupTool<AzurePolicySearchClient.ScopeType> {

  /**
   * Default constructor for JustInTimeDocumentLookup.
   * Initializes the class with default instances of AzureSearchClient,
   * IStandaloneModelClient, and DocumentChunkFilter.
   */
  public JustInTimePolicyLookup() {
    this(
      new AzurePolicySearchClient(),
      new StandaloneModelClient(),
      new PolicyChunkFilter()
    );
  }

  /**
   * Constructor for JustInTimeDocumentLookup.
   *
   * @param searchClient The AzureSearchClient instance to use for searching documents.
   *                     If null, a default instance of AzureSearchClient is created.
   * @param summarizer   The IStandaloneModelClient instance to use for summarizing documents.
   *                     If null, a default instance of StandaloneModelClient is created.
   * @param chunkFilter  The DocumentChunkFilter instance to use for filtering document chunks.
   *                     If null, a default instance of DocumentChunkFilter is created.
   */
  public JustInTimePolicyLookup(
    AzurePolicySearchClient searchClient,
    IStandaloneModelClient summarizer,
    PolicyChunkFilter chunkFilter
  ) {
    super(
      searchClient == null ? new AzurePolicySearchClient() : searchClient,
      summarizer == null ? new StandaloneModelClient() : summarizer,
      chunkFilter == null ? new DocumentChunkFilter() : chunkFilter
    );
  }

  /**
   * Summarizes laws and policies based on the provided query.
   * Uses the default scope type of AzureSearchClient.ScopeType.All.
   *
   * @param query The query string used to search and summarize the document.
   * @return A summarized version of the document as a string.
   */
  public String summarizePolicy(String query) {
    return this.summarizePolicy(query, AzurePolicySearchClient.ScopeType.All);
  }

  /**
   * Summarizes laws and policies based on the provided query and scope.
   *
   * @param query The query string used to search and summarize the document.
   * @param scope The scope type to use for the document search.
   * @return A summarized version of the document as a string.
   */
  public String summarizePolicy(
    String query,
    AzurePolicySearchClient.ScopeType scope
  ) {
    return super.justInTimeLookup(query, scope, true);
  }
}
