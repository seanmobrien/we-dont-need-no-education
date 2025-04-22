package com.obapps.schoolchatbot.chat.assistants.models.ai.phases.one;

import com.obapps.core.ai.extraction.models.IRecordExtractionEnvelope;
import dev.langchain4j.model.output.structured.Description;
import java.util.List;

public class InitialKeyPointEnvelope
  implements IRecordExtractionEnvelope<InitialKeyPoint> {

  @Description(
    "Adds a Processing Note (📝⚙️) to the processing history of 📊📄.  This is used to explain anomolies, add information that may be useful for future analysis, or request access to information that was not available via a tool."
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

  @Description("The list of records returned in this pass of the document.")
  List<InitialKeyPoint> results;

  public InitialKeyPointEnvelope() {
    this(null);
  }

  public InitialKeyPointEnvelope(List<InitialKeyPoint> results) {
    super();
    this.results = results == null ? List.of() : results;
  }

  @Override
  public List<InitialKeyPoint> getResults() {
    return results;
  }

  /**
   * Sets the list of extracted records.
   *
   * @param results the list of records to set.
   */
  public void setResults(List<InitialKeyPoint> results) {
    this.results = results;
  }

  @Override
  public Boolean getAllRecordsEmitted() {
    return allRecordsEmitted;
  }

  @Override
  public Integer getMoreResultsAvailable() {
    return moreResultsAvailable;
  }

  @Override
  public List<String> getProcessingNotes() {
    return processingNotes;
  }
}
