package com.obapps.schoolchatbot.core.assistants.services.ai.supplementary;

import com.obapps.schoolchatbot.core.assistants.models.search.AiSearchResult;
import com.obapps.schoolchatbot.core.util.SupportingPrompts;
import dev.langchain4j.service.UserMessage;
import dev.langchain4j.service.V;
import java.util.List;

public interface ISearchAugmentor {
  @UserMessage(SupportingPrompts.JustInTimeLookupWithDocUserPrompt)
  public String augmentSearch(
    @V("query") String query,
    @V("document") String document,
    @V("results") List<AiSearchResult> results
  );
}
