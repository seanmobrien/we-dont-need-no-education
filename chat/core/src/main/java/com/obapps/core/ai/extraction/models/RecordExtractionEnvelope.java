package com.obapps.core.ai.extraction.models;

import dev.langchain4j.model.output.structured.Description;
import java.util.ArrayList;
import java.util.List;

/**
 * A generic envelope class for handling the extraction of records from a document.
 * This class extends {@code BaseRecordExtractionEnvelope} and provides functionality
 * to manage a list of extracted records.
 *
 * @param <TRecord> the type of records contained in the envelope.
 */
public class RecordExtractionEnvelope<TRecord>
  extends BaseRecordExtractionEnvelope
  implements IRecordExtractionEnvelope<TRecord> {

  /**
   * The list of records returned in this pass of the document.
   */
  @Description("The list of records returned in this pass of the document.")
  List<TRecord> results;

  /**
   * Default constructor that initializes the envelope with default values.
   * Sets {@code allRecordsEmitted} to {@code false} and {@code moreResultsAvailable} to {@code 0}.
   */
  protected RecordExtractionEnvelope() {
    super();
  }

  /**
   * Constructor that initializes the envelope with a list of records.
   *
   * @param results the list of records to initialize the envelope with.
   */
  public RecordExtractionEnvelope(List<TRecord> results) {
    this();
    this.results = results;
  }

  /**
   * Retrieves the list of extracted records.
   * If {@code results} is {@code null}, it returns an empty list.
   *
   * @return the list of extracted records.
   */
  public List<TRecord> getResults() {
    return results == null ? new ArrayList<>() : results;
  }

  /**
   * Sets the list of extracted records.
   *
   * @param results the list of records to set.
   */
  public void setResults(List<TRecord> results) {
    this.results = results;
  }
}
