package com.obapps.schoolchatbot.core.assistants.services.ai.phases;

import com.obapps.core.ai.extraction.models.IRecordExtractionEnvelope;
import dev.langchain4j.service.Result;
import dev.langchain4j.service.V;

public interface IPhaseAnalyst<
  TModel, TEnvelope extends IRecordExtractionEnvelope<TModel>
> {
  public Result<TEnvelope> processStage(Integer documentId);

  public Result<TEnvelope> resumeExtraction(
    @V("iteration") Integer iteration,
    @V("matchesFound") Integer matchesFound
  );
}
