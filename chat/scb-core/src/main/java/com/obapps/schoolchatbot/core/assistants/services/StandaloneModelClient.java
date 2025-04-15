package com.obapps.schoolchatbot.core.assistants.services;

import com.obapps.schoolchatbot.core.services.ModelType;
import dev.langchain4j.model.chat.ChatLanguageModel;

/**
 * The StandaloneModelClient class provides a client for interacting with a chat language model.
 * It supports creating a default model or using a provided model, and allows sending prompts to the model.
 */
public class StandaloneModelClient implements IStandaloneModelClient {

  /**
   * The chat language model used by this client.
   */
  private final ChatLanguageModel model;

  /**
   * Default constructor that initializes the client with a default LoFi model.
   */
  public StandaloneModelClient() {
    this(null);
  }

  /**
   * Constructor that allows initializing the client with a specific chat language model.
   *
   * @param llm The chat language model to use. If null, a default LoFi model is created.
   */
  public StandaloneModelClient(ChatLanguageModel llm) {
    super();
    model = llm == null
      ? new StandaloneModelClientFactory().createModel(ModelType.LoFi)
      : llm;
  }

  /**
   * Retrieves the chat language model used by this client.
   *
   * @return The chat language model.
   */
  public ChatLanguageModel getModel() {
    return model;
  }

  /**
   * Sends a prompt to the chat language model and retrieves the response.
   *
   * @param prompt The prompt to send to the model. Must not be null or empty.
   * @return The response from the model, or a message indicating the prompt is invalid.
   */
  public String call(String prompt) {
    if (prompt == null || prompt.isEmpty()) {
      return "Prompt is empty or null";
    }
    var response = model.chat(prompt);
    return response;
  }
}
