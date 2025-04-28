package com.obapps.schoolchatbot.core.assistants.types;

import com.obapps.schoolchatbot.core.models.AnalystDocumentResult;

/**
 * Interface representing a stage analyst responsible for processing documents.
 */
public interface IStageAnalystController extends IDocumentContentSource {
  /**
   * Processes a document based on its unique identifier.
   *
   * @param documentId The unique identifier of the document to process.
   * @return An {@link AnalystDocumentResult} containing the result of the processing.
   */
  AnalystDocumentResult processDocument(Integer documentId);
}
