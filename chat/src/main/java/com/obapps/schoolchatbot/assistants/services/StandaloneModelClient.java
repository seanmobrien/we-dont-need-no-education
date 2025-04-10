package com.obapps.schoolchatbot.assistants.services;

import dev.langchain4j.model.chat.ChatLanguageModel;

public class StandaloneModelClient implements IStandaloneModelClient {

  private final ChatLanguageModel model;

  public StandaloneModelClient() {
    this(null);
  }

  public StandaloneModelClient(ChatLanguageModel llm) {
    super();
    model = llm == null
      ? new StandaloneModelClientFactory()
        .createModel(StandaloneModelClientFactory.ModelType.LoFi)
      : llm;
  }

  public ChatLanguageModel getModel() {
    return model;
  }

  public String call(String prompt) {
    if (prompt == null || prompt.isEmpty()) {
      return "Prompt is empty or null";
    }
    var response = model.chat(prompt);
    return response;
  }
}
