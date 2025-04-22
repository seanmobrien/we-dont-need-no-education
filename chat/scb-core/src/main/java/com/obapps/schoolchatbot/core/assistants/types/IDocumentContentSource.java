package com.obapps.schoolchatbot.core.assistants.types;

import com.obapps.schoolchatbot.core.assistants.content.DocumentWithMetadataContent;

/**
 * Represents a source of document content with associated metadata.
 * This interface provides a method to retrieve a document along with its metadata content.
 */
public interface IDocumentContentSource {
  /**
   * Retrieves the document with its associated metadata content.
   *
   * @return A {@link DocumentWithMetadataContent} object representing the document.
   */
  DocumentWithMetadataContent getSourceDocument();
}
