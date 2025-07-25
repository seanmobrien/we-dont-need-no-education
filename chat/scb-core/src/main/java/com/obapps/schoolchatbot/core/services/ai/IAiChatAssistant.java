package com.obapps.schoolchatbot.core.services.ai;

import dev.langchain4j.service.Result;

/**
 * This is an "AI Service". It is a Java service with AI capabilities/features.
 * It can be integrated into your code like any other service, acting as a bean, and can be mocked for testing.
 * The goal is to seamlessly integrate AI functionality into your (existing) codebase with minimal friction.
 * It's conceptually similar to Spring Data JPA or Retrofit.
 * You define an interface and optionally customize it with annotations.
 * LangChain4j then provides an implementation for this interface using proxy and reflection.
 * This approach abstracts away all the complexity and boilerplate.
 * So you won't need to juggle the model, messages, memory, RAG components, tools, output parsers, etc.
 * However, don't worry. It's quite flexible and configurable, so you'll be able to tailor it
 * to your specific use case.
 * <br>
 * More info here: https://docs.langchain4j.dev/tutorials/ai-services
 */
public interface IAiChatAssistant {
  /**
   * This method is used to ask a question to the AI assistant.  It can be useful
   * when debugging or wanting clarification on specific responses.
   *
   * @param query The question to be asked.
   * @return The answer from the AI assistant.
   */
  Result<String> answer(String query);
}
