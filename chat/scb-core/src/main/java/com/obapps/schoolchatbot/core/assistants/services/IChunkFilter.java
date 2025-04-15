package com.obapps.schoolchatbot.core.assistants.services;

import java.util.List;

/**
 * Interface for filtering chunks of text based on specific criteria.
 */
public interface IChunkFilter {
  /**
   * Filters the top N chunks from the provided list based on a specific criterion.
   *
   * @param chunks the list of chunks to filter
   * @param max the maximum number of chunks to include in the result
   * @return a list containing the top N filtered chunks
   */
  public List<String> filterTopN(List<String> chunks, int max);
}
