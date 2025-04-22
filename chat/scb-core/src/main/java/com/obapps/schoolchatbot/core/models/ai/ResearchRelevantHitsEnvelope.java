package com.obapps.schoolchatbot.core.models.ai;

import com.obapps.core.ai.extraction.models.*;
import dev.langchain4j.model.output.structured.Description;
import java.util.List;

/**
 * Represents the result of analyzing a document.
 */
public class ResearchRelevantHitsEnvelope
  extends BaseRecordExtractionEnvelope
  implements IRecordExtractionEnvelope<ResearchAssistantReleventHits> {

  /**
   * The list of records returned in this pass of the document.
   */
  @Description("The list of records returned in this pass of the document.")
  List<ResearchAssistantReleventHits> results;

  @Override
  public List<ResearchAssistantReleventHits> getResults() {
    return results;
  }
}
