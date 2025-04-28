package com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two;

import com.obapps.core.ai.extraction.models.IRecordExtractionEnvelope;
import dev.langchain4j.model.output.structured.Description;
import java.util.List;

public class CategorizedCallToActionEnvelope
  implements IRecordExtractionEnvelope<CategorizedCallToAction> {

  @Description(
    "Adds a Processing Note (📝⚙️) to the processing history of 🔔.  This is used to explain anomolies, " +
    "or add information that may be useful for future analysis, or request access to information that was not available " +
    "via a tool."
  )
  public List<String> processingNotes;

  /**
   * When you are certain there are no more matches to be found, this field should be set to true.
   */
  @Description(
    "When you are certain there are no more matches to be found, this field should be set to true.  If your response is truncated due to length limits or iteration caps, you must set \"moreResultsAvailable\" to the estimated number of remaining items and \"allRecordsEmitted\" to false. Only set \"allRecordsEmitted\" to true if you are absolutely certain no more records remain to be processed."
  )
  public Boolean allRecordsEmitted;

  /**
   * When processing has halted because the iteration limit was reached but more items are available, this field
   * should contain an estimate of the number of remaining items.
   */
  @Description(
    "This field should contain the estimated total number of items that would be returned with multiple passes and iterative processing."
  )
  public Integer moreResultsAvailable;

  @Description(
    "The list of categorized 🔔 returned in this pass of the document.  This is considered the 🧾 record."
  )
  List<CategorizedCallToAction> results;

  public CategorizedCallToActionEnvelope() {
    this(null);
  }

  public CategorizedCallToActionEnvelope(
    List<CategorizedCallToAction> results
  ) {
    super();
    this.results = results == null ? List.of() : results;
  }

  @Override
  public List<CategorizedCallToAction> getResults() {
    return results;
  }

  /**
   * Sets the list of extracted records.
   *
   * @param results the list of records to set.
   */
  public void setResults(List<CategorizedCallToAction> results) {
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
