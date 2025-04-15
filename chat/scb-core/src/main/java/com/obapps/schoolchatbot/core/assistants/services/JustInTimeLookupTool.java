package com.obapps.schoolchatbot.core.assistants.services;

import com.obapps.core.util.EnvVars;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * A utility class for performing just-in-time lookups and summarizing results.
 * This class is designed to assist in document analysis for compliance and insights.
 *
 * @param <TScope> The type of the scope within which the lookup is performed.
 */
public class JustInTimeLookupTool<TScope> {

  /** The number of search hits to retrieve from the search client. */
  private static final Integer NUMBER_OF_SEARCH_HITS = 15;
  /** The number of summarized results to filter from the search hits. */
  private static final Integer NUMBER_OF_SUMMARIZED_RESULTS = 5;

  /** Logger instance for logging debug and informational messages. */
  protected final Logger log;
  /** The search client used to perform hybrid searches. */
  protected final AzureBaseSearchClient<TScope> searchClient;
  /** The filter used to extract top document chunks from search results. */
  protected final IChunkFilter chunkFilter;
  /** The summarizer client used to generate summaries from document chunks. */
  protected final IStandaloneModelClient summarizer;

  /**
   * Constructs a new instance of JustInTimeLookupTool.
   *
   * @param searchClient The search client used to perform hybrid searches.
   * @param summarizer The summarizer client used to generate summaries.
   * @param chunkFilter The filter used to extract top document chunks.
   */
  protected JustInTimeLookupTool(
    AzureBaseSearchClient<TScope> searchClient,
    IStandaloneModelClient summarizer,
    IChunkFilter chunkFilter
  ) {
    this.log = LoggerFactory.getLogger(this.getClass());
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

    List<String> chunks = searchClient.hybridSearch(
      query,
      settings.getNumSearchHits(),
      scope
    ); // pull top 15
    List<String> filtered = settings.isPrefilterEnabled()
      ? chunkFilter.filterTopN(chunks, NUMBER_OF_SUMMARIZED_RESULTS)
      : chunks; // use best 5

    StringBuilder chunkBlock = new StringBuilder();
    for (int i = 0; i < filtered.size(); i++) {
      chunkBlock
        .append("__BEGIN Result [" + i + "]__\n")
        .append(filtered.get(i))
        .append("\n")
        .append("__END Result [" + i + "]__\n\n");
    }

    if (!summarize || !settings.isSummaryEnabled()) {
      return chunkBlock.length() > 0
        ? chunkBlock.toString()
        : "No results found.";
    }

    String summarizationPrompt = String.format(
      "You are an AI Legal research assistant assisting in document analysis for compliance and insights.\n\n" +
      "Given a set of source documents, and attorney query, your task is to:\n\n" +
      "1. Prepare information for attorney review.\n" +
      "2. Remove content that is irrelevant.\n" +
      "3. **DO NOT** pull from any other sources\n\n" +
      "4. Include content as-is from source materials - **DO NOT** summarize or change relevant text.\n\n" +
      /* 
      "1. Extract key points, deadlines, and responsible actors.\n" +
      "2. Return a short summary paragraph.\n" +
      "3. Provide a more detailed summary on the 3 most relevant chunks.\n\n" +
      "** Example Input **\n\n" +
      "__BEGIN Chunk [0]__\n" +
      "The document outlines the following steps...\n" +
      "__END Chunk [0]__\n\n" +
      "__BEGIN Chunk [1]__\n" +
      "The coordinator shall review the document within 5 days.\n" +
      "__END Chunk [1]__\n\n" +
      "__BEGIN Chunk [2]__\n" +
      "The team may request additional information...\n\n" +
      "__END Chunk [2]__\n\n\n" +
      "** Example Output **\n\n" +
      "Summary:\n" +
      "The school must take reasonable steps to address Title IX complaints, with the Title IX coordinator responsible for beginning an investigation within 10 calendar days. Students also have the option to request accommodations\n" +
      "3 Most Relevant Chunks:\n" +
      "[0] The document outlines the following steps...\n" +
      "[1] The coordinator shall review the document within 5 days.\n" +
      "[2] The team may request additional information...\n\n\n\n" +
       */

      "--- BEGIN INPUT ---\n" +
      "%s\n" +
      "--- END INPUT ---\n\n" +
      "Summary:\n",
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
