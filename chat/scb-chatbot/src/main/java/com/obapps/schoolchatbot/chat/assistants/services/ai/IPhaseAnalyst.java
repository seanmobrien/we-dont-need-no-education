package com.obapps.schoolchatbot.chat.assistants.services.ai;

import com.obapps.core.ai.extraction.models.IRecordExtractionEnvelope;
import com.obapps.schoolchatbot.chat.assistants.Prompts;
import dev.langchain4j.service.Result;
import dev.langchain4j.service.UserMessage;
import dev.langchain4j.service.V;

public interface IPhaseAnalyst<
  TModel, TEnvelope extends IRecordExtractionEnvelope<TModel>
> {
  @UserMessage(Prompts.StartExtractionUserPromptText)
  public Result<TEnvelope> processStage(Integer documentId);

  @UserMessage(Prompts.ContinueExtractionUserPromptText)
  public Result<TEnvelope> resumeExtraction(
    @V("iteration") Integer iteration,
    @V("matchesFound") Integer matchesFound
  );
}
