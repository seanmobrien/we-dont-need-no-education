package com.obapps.schoolchatbot.core.assistants.services;

import com.obapps.core.util.EnvVars;
import com.obapps.schoolchatbot.core.assistants.types.IDocumentContentSource;
import com.obapps.schoolchatbot.core.util.PromptSymbols;
import java.util.List;
import java.util.Objects;
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
  protected final IStandaloneModelClient summarizer;
  /** The document content source used to retrieve document content. */
  protected final IDocumentContentSource documentSource;

  /**
   * Constructs a new instance of JustInTimeLookupTool.
   *
   * @param documentSource The document content source used to retrieve document content.
   * @param searchClient The search client used to perform hybrid searches.
   * @param summarizer The summarizer client used to generate summaries.
   * @param chunkFilter The filter used to extract top document chunks.
   */
  protected JustInTimeLookupTool(
    IDocumentContentSource documentSource,
    AzureBaseSearchClient<TScope> searchClient,
    IStandaloneModelClient summarizer,
    IChunkFilter chunkFilter
  ) {
    this.log = LoggerFactory.getLogger(this.getClass());
    this.documentSource = documentSource;
    this.searchClient = searchClient;
    this.chunkFilter = chunkFilter;
    this.summarizer = summarizer;
  }

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
    List<String> chunks = searchClient.hybridSearch(
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
    List<String> filtered = settings.isPrefilterEnabled()
      ? chunkFilter.filterTopN(chunks, settings.getNumSummary())
      : chunks; // use best 5
    log.debug("Filtered chunks: {}", filtered);
    if (filtered.isEmpty()) {
      return "No results found.";
    }

    StringBuilder chunkBlock = new StringBuilder();
    for (int i = 0; i < filtered.size(); i++) {
      chunkBlock
        .append(PromptSymbols.ANALYZE + " Result [" + (i + 1) + "]\n")
        .append(filtered.get(i))
        .append("\n\n");
    }
    // Early exit if summarization is not needed
    log.debug("Chunked blocks: {}", chunkBlock.toString());
    if (summarizer == null || !summarize || !settings.isSummaryEnabled()) {
      return chunkBlock.toString();
    }

    var emailContents = new StringBuilder();
    var documentContent = documentSource == null
      ? null
      : documentSource.getSourceDocument();
    var documentObject = documentContent == null
      ? null
      : documentContent.getObject();
    if (documentObject == null) {
      emailContents
        .append("No document context was provided with this query...again!\n")
        .append(
          "You know how these senior researchers are, though...if you don't\n"
        )
        .append(
          "come back with SOMETHING useful, they will be all over you.  Assume the \n"
        )
        .append(
          "document was related to the ongoing Title IX investigation or a requset for \n"
        )
        .append("an education record.");
    } else {
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
    }

    // Pass off to model for the heavy lifting
    String summarizationPrompt = String.format(
      "You are a research assistant supporting a legal compliance investigation.\n\n" +
      "The legal team is analyzing the following communication between a parent and a school district:\n" +
      "===\n" +
      " %s\n" + // Document being analyzed
      "===\n\n" +
      "They issued this legal research query to better understand the situation:\n" +
      PromptSymbols.REFERENCE +
      " %s\n\n" +
      "You have been provided with retrieved policy documents, legal guidance, or prior communications in response to this query.\n\n" +
      PromptSymbols.INSTRUCTION +
      " Your task is to extract " +
      PromptSymbols.PINNED +
      " **only the sections directly relevant** to understanding or evaluating the email and search intent.\n" +
      PromptSymbols.WARNING +
      " Do not summarize the entire document. Instead, return specific passages that:\n" +
      PromptSymbols.CHECKLIST_CONFIRMED +
      " Provide legal or procedural context for what's discussed in the message\n" +
      PromptSymbols.CHECKLIST_CONFIRMED +
      " Clarify whether the district's actions or omissions may violate policy\n" +
      PromptSymbols.CHECKLIST_CONFIRMED +
      " Explain what a specific law, rule, or local policy requires or prohibits in this context\n\n" +
      PromptSymbols.CHECKLIST_CONFIRMED +
      " If nothing clearly applies to the email or search query, return nothing.\n" +
      PromptSymbols.EXCLUSION +
      " Do not editorialize or assume conclusions.\n" +
      PromptSymbols.EXCLUSION +
      " Do not explain general policy background unless it directly applies.\n\n" +
      PromptSymbols.INSIGHT +
      " The results will be passed to an LLM that will use them only as **supplementary context**, not as a basis for standalone findings. Precision is more valuable than coverage.\n\n",
      PromptSymbols.SECTION_DIVIDER + "Retrieved Documents:\n%s",
      emailContents.toString(),
      query,
      chunkBlock.toString()
    );

    var summary = summarizer.call(summarizationPrompt);
    log.debug(
      "{} Summary:\n\tInput: {}\n\tOutput: {}",
      this.getClass().getSimpleName(),
      summarizationPrompt,
      summary
    );
    return summary;
  }
}
