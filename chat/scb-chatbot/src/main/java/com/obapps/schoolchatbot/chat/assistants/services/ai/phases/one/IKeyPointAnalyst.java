package com.obapps.schoolchatbot.chat.assistants.services.ai.phases.one;

import com.obapps.schoolchatbot.chat.assistants.Prompts;
import com.obapps.schoolchatbot.chat.assistants.models.ai.phases.one.InitialKeyPoint;
import com.obapps.schoolchatbot.chat.assistants.models.ai.phases.one.InitialKeyPointEnvelope;
import com.obapps.schoolchatbot.chat.assistants.services.ai.IPhaseAnalyst;
import dev.langchain4j.service.Result;
import dev.langchain4j.service.UserMessage;
import dev.langchain4j.service.V;

public interface IKeyPointAnalyst
  extends IPhaseAnalyst<InitialKeyPoint, InitialKeyPointEnvelope> {
  @Override
  @UserMessage(Prompts.StartExtractionUserPromptText)
  public Result<InitialKeyPointEnvelope> processStage(Integer documentId);

  @Override
  @UserMessage(Prompts.ContinueExtractionUserPromptText)
  public Result<InitialKeyPointEnvelope> resumeExtraction(
    @V("iteration") Integer iteration,
    @V("matchesFound") Integer matchesFound
  );
}
