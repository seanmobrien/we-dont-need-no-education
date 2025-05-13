package com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two;

import com.obapps.core.ai.extraction.models.IRecordExtractionEnvelope;
import dev.langchain4j.model.output.structured.Description;
import java.util.List;
import java.util.stream.Collectors;

public class AssociatedResponsiveActionEnvelope
  implements IRecordExtractionEnvelope<AssociatedResponsiveAction> {

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

  @Description(
    "The list of associated responsive actions returned in this pass of the document."
  )
  List<AssociatedResponsiveAction> results;

  public AssociatedResponsiveActionEnvelope() {
    this(null);
  }

  public AssociatedResponsiveActionEnvelope(
    List<AssociatedResponsiveAction> results
  ) {
    super();
    this.results = results == null ? List.of() : results;
  }

  @Override
  public List<AssociatedResponsiveAction> getResults() {
    return results;
  }

  /**
   * Sets the list of extracted records.
   *
   * @param results the list of records to set.
   */
  public void setResults(List<AssociatedResponsiveAction> results) {
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
    return results
      .stream()
      .flatMap(note ->
        note.processingNotes
          .stream()
          .map(y -> String.format("Action Id %s:\n%s", note.id, y))
      )
      .collect(Collectors.toList());
  }
}
