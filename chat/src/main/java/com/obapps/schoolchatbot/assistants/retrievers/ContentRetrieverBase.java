package com.obapps.schoolchatbot.assistants.retrievers;

import dev.langchain4j.rag.content.Content;
import dev.langchain4j.rag.content.retriever.ContentRetriever;
import dev.langchain4j.rag.query.Query;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * The abstract base class for content retrievers, providing common functionality
 * for retrieving content based on a query and utility methods for content creation
 * and metadata handling.
 *
 * <p>This class implements the {@link ContentRetriever} interface and provides
 * a logging mechanism, abstract method for content retrieval, and helper methods
 * for parsing document IDs and creating content objects.</p>
 *
 * <h2>Key Features:</h2>
 * <ul>
 *   <li>Abstract method {@link #retrieve(Query)} to be implemented by subclasses
 *       for retrieving content based on a query.</li>
 *   <li>Utility methods for creating {@link Content} objects with or without metadata.</li>
 *   <li>Helper method for safely parsing document IDs from query metadata or text.</li>
 *   <li>Logging support for debugging and error handling.</li>
 * </ul>
 *
 * <h2>Usage:</h2>
 * <p>Subclasses should extend this base class and implement the {@link #retrieve(Query)}
 * method to define the specific logic for retrieving content.</p>
 *
 * <h2>Thread Safety:</h2>
 * <p>This class is not thread-safe as it contains a non-thread-safe logger instance.
 * Ensure proper synchronization if used in a multi-threaded environment.</p>
 *
 * @author [Your Name]
 * @version 1.0
 * @since 2023
 */
public abstract class ContentRetrieverBase implements ContentRetriever {

  public ContentRetrieverBase(Class<?> clazz) {
    this.log = LoggerFactory.getLogger(clazz);
  }

  protected final Logger log;

  public abstract List<Content> retrieve(Query query);

  protected Integer getDocumentId(Logger log, Query query) {
    var meta = query.metadata();
    if (meta != null) {
      var userQuery = meta.userMessage().singleText();
      try {
        return Integer.parseInt(userQuery);
      } catch (NumberFormatException e) {
        // If we cannot parse from userMessage we try from text
      }
    }
    var raw = query.text();
    try {
      return Integer.parseInt(raw);
    } catch (NumberFormatException e) {
      // Handle the exception if the string cannot be parsed as an integer
      log.debug("Error parsing document ID from query: " + raw, e);
    }
    return 0;
  }

  /**
   * Creates a new instance of {@link Content} from the provided text.
   *
   * @param text The input text to be converted into a {@link Content} object.
   * @return A {@link Content} object created from the given text.
   */
  protected static Content CreateContent(String text) {
    return Content.from(dev.langchain4j.data.segment.TextSegment.from(text));
  }

  /**
   * Creates a new instance of {@link Content} using the provided text and metadata.
   *
   * @param text The text content to be included in the {@link Content} object.
   * @param meta A map containing metadata associated with the content.
   * @return A {@link Content} object constructed from the provided text and metadata.
   */
  protected static Content CreateContent(
    String text,
    Map<String, Object> meta
  ) {
    var copyOfMeta = new HashMap<String, Object>();
    if (meta != null) {
      meta
        .keySet()
        .forEach(key -> {
          if (key != null && !key.isEmpty()) {
            var value = meta.get(key);
            if (value != null) {
              copyOfMeta.put(key, value);
            }
          }
        });
    }
    return Content.from(
      dev.langchain4j.data.segment.TextSegment.from(
        text,
        dev.langchain4j.data.document.Metadata.from(copyOfMeta)
      )
    );
  }
}
