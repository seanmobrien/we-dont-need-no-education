package com.obapps.schoolchatbot.chat.assistants.services.ai.phases.two;

import com.obapps.schoolchatbot.chat.assistants.Prompts;
import com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.CtaOrResponsiveActionEnvelope;
import com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.InitialCtaOrResponsiveAction;
import com.obapps.schoolchatbot.core.assistants.services.ai.phases.IPhaseAnalyst;
import dev.langchain4j.service.Result;
import dev.langchain4j.service.UserMessage;
import dev.langchain4j.service.V;

public interface ICtaExtractionAnalyst
  extends
    IPhaseAnalyst<InitialCtaOrResponsiveAction, CtaOrResponsiveActionEnvelope> {
  @Override
  @UserMessage(Prompts.StartExtractionUserPromptText)
  public Result<CtaOrResponsiveActionEnvelope> processStage(Integer documentId);

  @Override
  @UserMessage(Prompts.ContinueExtractionUserPromptText)
  public Result<CtaOrResponsiveActionEnvelope> resumeExtraction(
    @V("iteration") Integer iteration,
    @V("matchesFound") Integer matchesFound
  );
}
