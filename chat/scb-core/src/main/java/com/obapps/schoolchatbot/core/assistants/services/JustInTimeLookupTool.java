package com.obapps.schoolchatbot.core.assistants.services;

import com.obapps.core.ai.factory.types.ILanguageModelFactory;
import com.obapps.core.util.EnvVars;
import com.obapps.core.util.Strings;
import com.obapps.schoolchatbot.core.assistants.types.IDocumentContentSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * A utility class for performing just-in-time lookups and summarizing results.
 * This class is designed to assist in document analysis for compliance and insights.
 *
 * @param <TScope> The type of the scope within which the lookup is performed.
 */
public class JustInTimeLookupTool<TScope> {

  /** Logger instance for logging debug and informational messages. */
  protected final Logger log;
  /** The search client used to perform hybrid searches. */
  protected final AzureBaseSearchClient<TScope> searchClient;
  /** The filter used to extract top document chunks from search results. */
  protected final IChunkFilter chunkFilter;
  /** The summarizer client used to generate summaries from document chunks. */
  protected final ILanguageModelFactory modelFactory;
  /** The document content source used to retrieve document content. */
  protected final IDocumentContentSource documentSource;

  /**
   * Constructs a new instance of JustInTimeLookupTool.
   *
   * @param documentSource The document content source used to retrieve document content.
   * @param searchClient The search client used to perform hybrid searches.
   * @param modelFactory The language model factory used to create AI services.
   * @param chunkFilter The filter used to extract top document chunks.
   */
  protected JustInTimeLookupTool(
    IDocumentContentSource documentSource,
    AzureBaseSearchClient<TScope> searchClient,
    ILanguageModelFactory modelFactory,
    IChunkFilter chunkFilter
  ) {
    this.log = LoggerFactory.getLogger(this.getClass());
    this.documentSource = documentSource;
    this.searchClient = searchClient;
    this.chunkFilter = chunkFilter;
    this.modelFactory = modelFactory;
  }

  void scratchpad() {}

  /**
   * Performs a just-in-time lookup based on the provided query and scope and returns
   * a summary of the resultset.
   *
   * @param query The query string to be used for the lookup.
   * @param scope The scope within which the lookup is performed.
   * @return The result of the just-in-time lookup as a string.
   */
  protected String justInTimeLookup(String query, TScope scope) {
    return justInTimeLookup(query, scope, true);
  }

  /**
   * Performs a just-in-time lookup for a given query and scope, optionally summarizing the results.
   *
   * @param query The search query string to be processed.
   * @param scope The scope within which the search is performed.
   * @param summarize A boolean flag indicating whether to summarize the results.
   *                  If true, the method will return a summarized version of the results.
   *                  If false, it will return the raw filtered chunks.
   * @return A string containing either the raw filtered chunks or a summarized version of the results.
   *         If summarization is enabled, the summary includes key points, deadlines, and responsible actors,
   *         along with an indication of the most relevant chunks.
   */
  protected String justInTimeLookup(
    String query,
    TScope scope,
    Boolean summarize
  ) {
    var settings = EnvVars.getInstance().getJustInTimeSearch();
    // pull top n chunks from the search client
    var chunks = searchClient.hybridSearchEx(
      query,
      settings.getNumSearchHits(),
      scope
    );
    log.trace(
      "{} Search results:\n\tInput: {}\n\tOutput: {}",
      this.getClass().getSimpleName(),
      query,
      chunks
    );
    // filter the top n chunks from the search results
    var filtered = chunks;
    /*
    settings.isPrefilterEnabled()
      ? chunkFilter.filterTopN(chunks, settings.getNumSummary())
      : chunks; // use best 5
    log.debug("Filtered chunks: {}", filtered);
     */
    if (filtered.isEmpty()) {
      return "No results found.";
    }

    StringBuilder chunkBlock = new StringBuilder();
    for (int i = 0; i < filtered.size(); i++) {
      var hit = filtered.get(i);
      chunkBlock
        .append(
          Strings.getRecordOutput(
            "Hit #" + i + "-1",
            hit.getContent(),
            hit.getMetatadaForRecord()
          )
        )
        .append("\n");
    }
    // Early exit if summarization is not needed
    log.info("Returning search results: {}", chunkBlock.toString());
    return chunkBlock.toString();
    /*

    if (!summarize || !settings.isSummaryEnabled()) {
    }

    var emailContents = new StringBuilder();
    var documentContent = documentSource == null
      ? null
      : documentSource.getSourceDocument();
    var documentObject = documentContent == null
      ? null
      : documentContent.getObject();

    if (documentObject != null) {
      emailContents
        .append(PromptSymbols.REFERENCE + " Sender: ")
        .append(
          Objects.requireNonNullElse(documentObject.getSender(), "[Not Set]")
        )
        .append("\nRole: ")
        .append(
          Objects.requireNonNullElse(
            documentObject.getSenderRole(),
            "[Not Set]"
          )
        )
        .append("\n")
        .append("Contents: \n")
        .append(PromptSymbols.QUOTE + " ")
        .append(
          Objects.requireNonNullElse(documentObject.getContent(), "[Not Set]")
        )
        .append("\n");
    } else {
      emailContents.append(
        "NOTE: No specific document context was provided.  Please use general case outline instead.\n"
      );
    }

    var ret = modelFactory
      .createService(
        AiServiceOptions.builder(ISearchAugmentor.class)
          .setModelType(ModelType.LoFi)
          .setMemoryWindow(20)
          .onSetupService(svc ->
            svc.systemMessageProvider(o ->
              documentObject == null
                ? JustInTimeLookupWithoutDocSystemPrompt
                : JustInTimeLookupSystemPrompt
            )
          )
          .build()
      )
      .augmentSearch(
        query,
        Strings.getRecordOutput("📊📄", emailContents.toString()),
        chunkBlock.toString()
      );
    log.trace("Returning augmented search results: {}", ret);
    return ret;
    */
  }

  public static final String JustInTimeLookupBaseSystemPrompt =
    """
    You are a research assistant supporting a legal compliance investigation.  The legal team has provided
    you with a query to investigate%s and a set of preliminary search results.

    📝 Your task is to analyze the search results and extract 📌 **only the sections directly relevant**
    to understanding or evaluating the email and search intent.
    ⚠️ Do not summarize the entire document. Instead, return specific passages that:
      ✅ Provide legal or procedural context for what's discussed in the message.
      ✅ Clarify whether the district's actions or omissions may violate policy.
      ✅ Explain what a specific law, rule, or local policy requires or prohibits in this context.
      ✅ Demonstrate an understanding or lack thereof of the district's obligations under the law.
      ✅ Include a requset for a specific action or response from the district.
        - Whenever possible, include the deadline for the action or response.
    📝 If nothing clearly applies to the email or search query within a result, exclude that individual
        result in your response.
    ❌ Do not editorialize or assume conclusions.
    ❌ Do not explain general policy background unless it directly applies.
    🧠 The results will be passed to an LLM that will use them only as **supplementary context**, not
        as a basis for standalone findings. Precision is more valuable than coverage
    📝 The results will be used to draft a legal research memo, so be sure to include any relevant
        deadlines or responsible actors when applicable.
    ⚠️ Any metadata provided with the result should be returned without modification.

    🗂️ The request will be structured as follows:
    BEGIN Request Record Schema
    🕵️ (Query): <Contents of the Research Query driving the request>
    %s
    📋 Search Results:
    _#_ Result #1<Result Number> <Metadata Key: Metadata Value>|<Metadata Key: Metadata Value>|<Metadata Key: Metadata Value> _#_
    <Contents of Search Result 1>
    _#_ END Result #1<Result Number> _#_
    _#_ Result <Result Number> <Metadata Key: Metadata Value>|<Metadata Key: Metadata Value>|<Metadata Key: Metadata Value> _#_
    <Contents of Search Result 2>
    _#_ END Result <Result Number> _#_
    END Request Record Schema

    🗂️ Your response should be structured as follows:
    BEGIN Response Record Schema
    📋 Augmented Search Results:
    _#_ Result #1-1<Result Number 1, Relevant Passage Number 1> <Metadata Key: Metadata Value>|<Metadata Key: Metadata Value>|<Metadata Key: Metadata Value> _#_
    <Contents of Search Result 1>
    _#_ END Result #1-1<Result Number 1>, <Relevant Finding Number 1> _#_
    _#_ Result #1<Result Number 1>-2<Relevant Passage Number 2>,  <Metadata Key: Metadata Value>|<Metadata Key: Metadata Value>|<Metadata Key: Metadata Value> _#_
    <Contents of Search Result 1>
    _#_ END Result #1-2<Result Number 1, Relevant Finding Number 2> _#_
    _#_ Result <Result Number>-<Relevant Passage Number> <Metadata Key: Metadata Value>|<Metadata Key: Metadata Value>|<Metadata Key: Metadata Value> _#_
    <Contents of Search Result 2>
    _#_ END Result <Result Number> _#_
    END Response Record Schema
    """;
  public static final String JustInTimeLookupSystemPrompt = String.format(
    JustInTimeLookupBaseSystemPrompt,
    ", the document they are analyzing to provide context",
    "_#_ 📊📄<Document Context> _#_\r\n" + //
    "    <Contents of the Document under analysis>\r\n" + //
    "    _#_ END Document Context _#_"
  );
  public static final String JustInTimeLookupWithoutDocSystemPrompt =
    String.format(JustInTimeLookupBaseSystemPrompt, "", "");

  public static final String JustInTimeLookupWithoutDocUserPrompt =
    """
    🕵️: {query}
    📋 Search Results:
    {results}
    """;

  public static final String JustInTimeLookupWithDocUserPrompt =
    """
    🕵️: {query}
    {document}
    📋 Search Results:
    {results}
    """;
}
