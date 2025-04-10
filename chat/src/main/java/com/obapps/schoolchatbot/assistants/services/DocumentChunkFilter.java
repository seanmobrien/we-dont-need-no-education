package com.obapps.schoolchatbot.assistants.services;

import java.util.List;
import java.util.stream.Collectors;

public class DocumentChunkFilter {

  /**
   * Filters the top document chunks based on relevance.
   *
   * @param chunks The list of document chunks to filter.
   * @param topK The number of top chunks to return.
   * @return A list of the top K document chunks.
   */
  public List<String> filterTopDocumentChunks(List<String> chunks, int topK) {
    if (chunks == null || chunks.isEmpty()) {
      return List.of();
    }

    // For simplicity, we assume the chunks are already sorted by relevance.
    // In a real implementation, you might apply additional filtering logic here.
    return chunks.stream().limit(topK).collect(Collectors.toList());
  }
}
