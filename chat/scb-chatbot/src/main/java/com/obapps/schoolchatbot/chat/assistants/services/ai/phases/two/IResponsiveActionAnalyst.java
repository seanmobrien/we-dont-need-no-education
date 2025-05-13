package com.obapps.schoolchatbot.chat.assistants.services.ai.phases.two;

import com.obapps.schoolchatbot.chat.assistants.Prompts;
import com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.AssociatedResponsiveActionEnvelope;
import com.obapps.schoolchatbot.core.services.ai.IAiChatAssistant;
import dev.langchain4j.service.Result;
import dev.langchain4j.service.UserMessage;
import dev.langchain4j.service.V;

public interface IResponsiveActionAnalyst extends IAiChatAssistant {
  @UserMessage(Prompts.StartExtractionUserPromptText)
  public Result<AssociatedResponsiveActionEnvelope> assignToCta(
    @V("it") String actions
  );

  @UserMessage(Prompts.ContinueExtractionUserPromptText)
  public Result<AssociatedResponsiveActionEnvelope> resumeAssignToCta(
    @V("iteration") Integer iteration,
    @V("matchesFound") Integer matchesFound
  );
}
