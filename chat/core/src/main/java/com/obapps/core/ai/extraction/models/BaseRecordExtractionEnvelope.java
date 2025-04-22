package com.obapps.core.ai.extraction.models;

import dev.langchain4j.model.output.structured.Description;
import java.util.List;

/**
 * The {@code BaseRecordExtractionEnvelope} class represents a container for managing the state of record extraction
 * processes. It provides fields to indicate whether all records have been emitted and to estimate the number of
 * remaining items when processing halts due to an iteration limit.
 *
 * <p>This class includes:
 * <ul>
 *   <li>{@code allRecordsEmitted}: A flag indicating whether all records have been emitted.</li>
 *   <li>{@code moreResultsAvailable}: An estimate of the number of remaining items when processing halts.</li>
 * </ul>
 *
 * <p>It also provides getter and setter methods for these fields, as well as a default constructor that initializes
 * the fields with default values.
 *
 * <p>Usage example:
 * <pre>
 *     BaseRecordExtractionEnvelope envelope = new BaseRecordExtractionEnvelope();
 *     envelope.setAllRecordsEmitted(true);
 *     envelope.setMoreResultsAvailable(10);
 * </pre>
 *
 * <p>Annotations:
 * <ul>
 *   <li>{@code @Description}: Provides additional metadata for the fields.</li>
 * </ul>
 */
public class BaseRecordExtractionEnvelope {

  @Description(
    "When you are certain there are no more matches to be found, this field should be set to true."
  )
  public List<String> processingNotes;

  /**
   * When you are certain there are no more matches to be found, this field should be set to true.
   */
  @Description(
    "When you are certain there are no more matches to be found, this field should be set to true."
  )
  public Boolean allRecordsEmitted;

  /**
   * When processing has halted because the iteration limit was reached but more items are available, this field
   * should contain an estimate of the number of remaining items.
   */
  @Description(
    "When processing has halted because the iteration limit was reached but more items are available, this field " +
    "should contain an estimate of the number of remaining items."
  )
  public Integer moreResultsAvailable;

  /**
   * Default constructor that initializes the envelope with default values.
   * Sets {@code allRecordsEmitted} to {@code false} and {@code moreResultsAvailable} to {@code 0}.
   */
  public BaseRecordExtractionEnvelope() {
    this.allRecordsEmitted = false;
    this.moreResultsAvailable = 0;
  }

  /**
   * Retrieves the value of the {@code allRecordsEmitted} field, indicating whether all records have been emitted.
   *
   * @return {@code true} if all records have been emitted, otherwise {@code false}.
   */
  public Boolean getAllRecordsEmitted() {
    return allRecordsEmitted;
  }

  /**
   * Sets the value of the {@code allRecordsEmitted} field.
   *
   * @param allRecordsEmitted a boolean indicating whether all records have been emitted.
   */
  public void setAllRecordsEmitted(Boolean allRecordsEmitted) {
    this.allRecordsEmitted = allRecordsEmitted;
  }

  /**
   * Retrieves the estimated number of remaining items when processing halts due to an iteration limit.
   *
   * @return the estimated number of remaining items.
   */
  public Integer getMoreResultsAvailable() {
    return moreResultsAvailable;
  }

  /**
   * Sets the estimated number of remaining items.
   *
   * @param moreResultsAvailable the estimated number of remaining items to set.
   */
  public void setMoreResultsAvailable(Integer moreResultsAvailable) {
    this.moreResultsAvailable = moreResultsAvailable;
  }

  public List<String> getProcessingNotes() {
    return processingNotes;
  }
}
