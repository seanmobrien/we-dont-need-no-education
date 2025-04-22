package com.obapps.core.ai.extraction.models;

import java.util.List;

/**
 * Represents an envelope for record extraction operations, providing methods to access
 * extracted records, determine if all records have been emitted, and estimate the number
 * of remaining items.
 *
 * @param <TRecord> the type of records contained in the envelope.
 */
public interface IRecordExtractionEnvelope<TRecord> {
  /**
   * Retrieves the list of extracted records.
   * If {@code results} is {@code null}, it returns an empty list.
   *
   * @return the list of extracted records.
   */
  public List<TRecord> getResults();

  /**
   * Retrieves the value of the {@code allRecordsEmitted} field, indicating whether all records have been emitted.
   *
   * @return {@code true} if all records have been emitted, otherwise {@code false}.
   */
  public Boolean getAllRecordsEmitted();

  /**
   * Retrieves the estimated number of remaining items when processing halts due to an iteration limit.
   *
   * @return the estimated number of remaining items.
   */
  public Integer getMoreResultsAvailable();

  /**
   * Retrieves a list of processing notes associated with the record extraction.
   *
   * @return a list of strings containing processing notes.
   */
  public List<String> getProcessingNotes();
}
