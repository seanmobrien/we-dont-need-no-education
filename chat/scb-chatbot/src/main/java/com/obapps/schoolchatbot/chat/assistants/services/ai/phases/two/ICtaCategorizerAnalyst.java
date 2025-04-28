package com.obapps.schoolchatbot.chat.assistants.services.ai.phases.two;

import com.obapps.schoolchatbot.chat.assistants.Prompts;
import com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.CallToActionCategoryEnvelope;
import com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.CategorizedCallToActionEnvelope;
import com.obapps.schoolchatbot.core.models.ai.ChatResponse;
import dev.langchain4j.service.Result;
import dev.langchain4j.service.UserMessage;
import dev.langchain4j.service.V;

public interface ICtaCategorizerAnalyst {
  @UserMessage(Prompts.StartExtractionForCtaCategories)
  public Result<CategorizedCallToActionEnvelope> assessTitleIx(
    @V("categories") String categories,
    @V("ctas") String ctas
  );

  @UserMessage(Prompts.ContinueExtractionUserPromptText)
  public Result<CategorizedCallToActionEnvelope> resumeTitleIxExtraction(
    @V("iteration") Integer iteration,
    @V("matchesFound") Integer matchesFound
  );

  @UserMessage(
    Prompts.StartExtractionForCtaCategories +
    "\n ***IMPORTANT***\nThe allRecordsEmitted field should only be set to true if you are absolutely certain no more records remain to be processed and they have all been emitted.  If your response is truncated due to length limits or iteration caps, you must set \"moreResultsAvailable\" to the estimated number of remaining items and \"allRecordsEmitted\" to false."
  )
  public Result<CallToActionCategoryEnvelope> categorizeBatch(
    @V("categories") String categories,
    @V("ctas") String ctas
  );

  @UserMessage(Prompts.ContinueExtractionForCtaCategories)
  public Result<CallToActionCategoryEnvelope> resumeCtaExtraction(
    @V("iteration") Integer iteration,
    @V("matchesFound") Integer matchesFound,
    @V("categories") String categories
  );

  Result<ChatResponse> answer(String query);
}
