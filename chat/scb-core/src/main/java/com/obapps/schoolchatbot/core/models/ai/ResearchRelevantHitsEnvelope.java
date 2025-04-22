package com.obapps.schoolchatbot.core.models.ai;

import com.obapps.core.ai.extraction.models.*;
import dev.langchain4j.model.output.structured.Description;
import java.util.List;

/**
 * Represents the result of analyzing a document.
 */
public class ResearchRelevantHitsEnvelope
  implements IRecordExtractionEnvelope<ResearchAssistantReleventHits> {

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
   * The list of records returned in this pass of the document.
   */
  @Description("The list of records returned in this pass of the document.")
  List<ResearchAssistantReleventHits> results;

  @Override
  public List<ResearchAssistantReleventHits> getResults() {
    return results;
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
