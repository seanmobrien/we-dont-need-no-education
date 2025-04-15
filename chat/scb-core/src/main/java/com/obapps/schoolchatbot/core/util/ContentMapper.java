package com.obapps.schoolchatbot.core.util;

import java.util.List;

/**
 * Utility class for mapping content between different formats.
 * This class provides methods to map content from RAG (Retrieval-Augmented Generation) content
 * to LangChain4j message content, with optional default values.
 */
public class ContentMapper {

  /**
   * Maps a single RAG content object to a LangChain4j message content object.
   *
   * @param sourceContent The source RAG content object to map from.
   * @return A LangChain4j message content object, or null if the source content is null.
   */
  public static dev.langchain4j.data.message.Content mapFromRagContent(
    dev.langchain4j.rag.content.Content sourceContent
  ) {
    return mapFromRagContent(sourceContent, null);
  }

  /**
   * Maps a single RAG content object to a LangChain4j message content object with a default value.
   *
   * @param sourceContent The source RAG content object to map from.
   * @param defaultValue The default value to use if the source content is null or has no text segment.
   * @return A LangChain4j message content object, or a default content object if the source is null.
   */
  public static dev.langchain4j.data.message.Content mapFromRagContent(
    dev.langchain4j.rag.content.Content sourceContent,
    String defaultValue
  ) {
    var sourceSegment = sourceContent == null
      ? null
      : sourceContent.textSegment();
    if (sourceSegment == null) {
      return defaultValue == null
        ? null
        : new dev.langchain4j.data.message.TextContent(defaultValue);
    }
    return new dev.langchain4j.data.message.TextContent(sourceSegment.text());
  }

  /**
   * Maps a list of RAG content objects to a list of LangChain4j message content objects.
   *
   * @param sourceContents The list of source RAG content objects to map from.
   * @return A list of LangChain4j message content objects, or null if the source list is null.
   */
  public static List<dev.langchain4j.data.message.Content> fromRagContent(
    List<dev.langchain4j.rag.content.Content> sourceContents
  ) {
    return fromRagContent(sourceContents, null);
  }

  /**
   * Maps a list of RAG content objects to a list of LangChain4j message content objects with a default value.
   *
   * @param sourceContents The list of source RAG content objects to map from.
   * @param defaultValue The default value to use for any null or empty content in the source list.
   * @return A list of LangChain4j message content objects, excluding null values.
   */
  public static List<dev.langchain4j.data.message.Content> fromRagContent(
    List<dev.langchain4j.rag.content.Content> sourceContents,
    String defaultValue
  ) {
    {
      if (sourceContents == null) {
        return null;
      }
      return sourceContents
        .stream()
        .map(sourceContent -> mapFromRagContent(sourceContent, defaultValue))
        .filter(sourceContent -> sourceContent != null)
        .toList();
    }
  }
}
