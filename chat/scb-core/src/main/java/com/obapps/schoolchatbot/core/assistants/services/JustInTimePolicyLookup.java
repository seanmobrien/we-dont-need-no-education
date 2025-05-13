package com.obapps.schoolchatbot.core.assistants.services;

import com.obapps.core.ai.factory.services.StandaloneModelClientFactory;
import com.obapps.core.ai.factory.types.ILanguageModelFactory;
import com.obapps.core.ai.factory.types.IStandaloneModelClient;
import com.obapps.schoolchatbot.core.assistants.types.IDocumentContentSource;

/**
 * The `JustInTimePolicyLookup` class extends the `JustInTimeLookupTool` to provide
 * functionality for searching and summarizing laws and policies in real-time.
 * It integrates with Azure services and custom filtering mechanisms to retrieve
 * and process relevant document content.
 *
 * <p>This class supports two constructors:
 * <ul>
 *   <li>A default constructor that initializes the class with default instances
 *       of `AzurePolicySearchClient`, `StandaloneModelClient`, and `PolicyChunkFilter`.</li>
 *   <li>A parameterized constructor that allows customization of the document source,
 *       search client, summarizer, and chunk filter.</li>
 * </ul>
 *
 * <p>Key Features:
 * <ul>
 *   <li>Search and summarize policies using a query string.</li>
 *   <li>Support for specifying a scope type for more targeted searches.</li>
 *   <li>Default scope type is `AzurePolicySearchClient.ScopeType.All`.</li>
 * </ul>
 *
 * <p>Usage Example:
 * <pre>
 * {@code
 * IDocumentContentSource documentSource = ...;
 * JustInTimePolicyLookup policyLookup = new JustInTimePolicyLookup(documentSource);
 * String summary = policyLookup.summarizePolicy("data privacy laws");
 * System.out.println(summary);
 * }
 * </pre>
 *
 * @see JustInTimeLookupTool
 * @see AzurePolicySearchClient
 * @see IStandaloneModelClient
 * @see PolicyChunkFilter
 */
public class JustInTimePolicyLookup
  extends JustInTimeLookupTool<AzurePolicySearchClient.ScopeType> {

  /**
   * Default constructor for JustInTimeDocumentLookup.
   * Initializes the class with default instances of AzureSearchClient,
   * IStandaloneModelClient, and DocumentChunkFilter.
   */
  public JustInTimePolicyLookup(IDocumentContentSource documentSource) {
    this(
      documentSource,
      new AzurePolicySearchClient(),
      new StandaloneModelClientFactory(),
      new PolicyChunkFilter()
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
  public JustInTimePolicyLookup(
    IDocumentContentSource documentSource,
    AzurePolicySearchClient searchClient,
    ILanguageModelFactory summarizer,
    PolicyChunkFilter chunkFilter
  ) {
    super(
      documentSource,
      searchClient == null ? new AzurePolicySearchClient() : searchClient,
      summarizer == null ? new StandaloneModelClientFactory() : summarizer,
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
    return super.justInTimeLookup(query, scope, false);
  }
}
