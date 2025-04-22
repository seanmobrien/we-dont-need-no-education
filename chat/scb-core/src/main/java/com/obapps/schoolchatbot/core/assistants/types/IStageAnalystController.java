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

  /**
   * Processes a document based on its unique identifier, with an option to throw an exception on error.
   *
   * @param documentId   The unique identifier of the document to process.
   * @param throwOnError A boolean indicating whether to throw an exception if an error occurs.
   * @return An {@link AnalystDocumentResult} containing the result of the processing.
   * @throws Throwable If an error occurs during processing and {@code throwOnError} is true.
   */
  AnalystDocumentResult processDocument(
    Integer documentId,
    Boolean throwOnError
  ) throws Throwable;
}
