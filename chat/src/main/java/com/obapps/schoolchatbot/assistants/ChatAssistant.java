package com.obapps.schoolchatbot.assistants;

import com.obapps.schoolchatbot.assistants.retrievers.SourceDocumentRetriever;
import com.obapps.schoolchatbot.data.Colors;
import com.obapps.schoolchatbot.util.Assistant;
import com.obapps.schoolchatbot.util.DocumentEmbedder;
import com.obapps.schoolchatbot.util.EnvVars;
import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.memory.ChatMemory;
import dev.langchain4j.memory.chat.MessageWindowChatMemory;
import dev.langchain4j.model.azure.AzureOpenAiChatModel;
import dev.langchain4j.model.azure.AzureOpenAiEmbeddingModel;
import dev.langchain4j.model.moderation.Moderation;
import dev.langchain4j.model.moderation.ModerationModel;
import dev.langchain4j.model.output.Response;
import dev.langchain4j.rag.DefaultRetrievalAugmentor;
import dev.langchain4j.rag.DefaultRetrievalAugmentor.DefaultRetrievalAugmentorBuilder;
import dev.langchain4j.rag.RetrievalAugmentor;
import dev.langchain4j.rag.content.retriever.ContentRetriever;
import dev.langchain4j.rag.query.router.DefaultQueryRouter;
import dev.langchain4j.service.AiServices;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Scanner;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Represents a generic chat assistant that provides foundational methods
 * for interacting with users and handling AI services.
 */
public class ChatAssistant {

  protected AzureOpenAiEmbeddingModel embeddingModel;
  protected AzureOpenAiChatModel chatLanguageModel;
  protected Assistant assistant;
  protected Logger log;

  protected ChatAssistant() {
    this.log = LoggerFactory.getLogger(DocumentEmbedder.class);
    // Step 1: Create the embedding model
    var openAiVars = EnvVars.getInstance().getOpenAi();

    // Create EmbeddingModel object for Azure OpenAI text-embedding-ada-002
    this.embeddingModel = AzureOpenAiEmbeddingModel.builder()
      .apiKey(openAiVars.getApiKey())
      .endpoint(openAiVars.getApiEndpoint())
      .deploymentName(openAiVars.getDeploymentEmbedding())
      .timeout(Duration.ofMillis(2 * 60 * 1000))
      .build();

    // Chat Model for high-fidelity analysis
    this.chatLanguageModel = AzureOpenAiChatModel.builder()
      .apiKey(openAiVars.getApiKey())
      .endpoint(openAiVars.getApiEndpoint())
      .deploymentName(openAiVars.getDeploymentChat())
      .logRequestsAndResponses(true)
      .timeout(Duration.ofMillis(2 * 60 * 1000))
      .build();
  }

  protected final RetrievalAugmentor getRetrievalAugmentor() {
    var retrievalAugmentorBuilder = prepareRetrievalAugmentor(
      DefaultRetrievalAugmentor.builder()
    );
    return retrievalAugmentorBuilder == null
      ? null
      : retrievalAugmentorBuilder.build();
  }

  protected final Assistant getAssistant() {
    if (this.assistant != null) {
      return this.assistant;
    }
    // Create assistant with support for overridden configuration
    this.assistant = prepareAssistantService(
      AiServices.builder(Assistant.class)
        .chatLanguageModel(chatLanguageModel)
        .moderationModel(
          new ModerationModel() {
            @Override
            public Response<Moderation> moderate(final String text) {
              return Response.from(Moderation.notFlagged());
            }

            @Override
            public Response<Moderation> moderate(List<ChatMessage> messages) {
              return moderate(messages.getLast());
            }
          }
        ),
      getRetrievalAugmentor(),
      MessageWindowChatMemory.withMaxMessages(10)
    ).build();
    // Return assistant
    return this.assistant;
  }

  /**
   * Prepares the assistant service with the specified augmentor and memory.
   *
   * @param builder The AI services builder.
   * @param retrievalAugmentor The retrieval augmentor to use.
   * @param chatMemory The chat memory to use, or null for no memory.
   * @param <T> The type of the AI service.
   * @return The configured AI services instance.
   */
  protected <T> AiServices<T> prepareAssistantService(
    AiServices<T> builder,
    RetrievalAugmentor retrievalAugmentor,
    ChatMemory chatMemory
  ) {
    if (retrievalAugmentor != null) {
      builder = builder.retrievalAugmentor(retrievalAugmentor);
    }
    if (chatMemory != null) {
      builder = builder.chatMemory(chatMemory);
    }
    return builder;
  }

  protected DefaultRetrievalAugmentorBuilder prepareRetrievalAugmentor(
    DefaultRetrievalAugmentorBuilder builder,
    ContentRetriever... additionalRetrievers
  ) {
    // Setup either a contentRetriever or a query router depending on which retrievers we were passed
    var retrievers = new ArrayList<ContentRetriever>(
      List.of(additionalRetrievers)
    );
    retrievers.add(new SourceDocumentRetriever());
    // Setup content retrieval augmentation
    return builder.queryRouter(new DefaultQueryRouter(retrievers));
  }

  private String autoResponse;

  @SuppressWarnings("unchecked")
  protected <T extends ChatAssistant> T setAutoResponse(String autoResponse) {
    this.autoResponse = autoResponse;
    return (T) this;
  }

  /**
   * Starts a conversation with the user using the provided scanner.
   *
   * @param scanner The scanner to read user input.
   */
  protected void startConversationWith(Scanner scanner) {
    Logger log = LoggerFactory.getLogger(this.getClass());
    while (true) {
      try {
        Colors.Set(c -> c.GREEN);
        log.info("==================================================");
        Colors.Set(c -> c.BOLD);
        log.info("User: ");
        Colors.Set(c -> c.RESET + c.GREEN);
        String userQuery;
        if (autoResponse == null) {
          userQuery = scanner.nextLine();
        } else {
          userQuery = autoResponse;
          log.info(userQuery);
          autoResponse = null;
        }
        log.info("==================================================");
        Colors.Reset();
        // Check for exit command
        if ("exit".equalsIgnoreCase(userQuery)) {
          break;
        }
        // Send user query to assistant and get response
        String agentAnswer = getAssistant().answer(userQuery);
        Colors.Set(c -> c.PURPLE);
        log.info("==================================================");
        log.info("Assistant: " + agentAnswer);
        Colors.Set(c -> c.RESET);
        autoResponse = onAssistantResponse(agentAnswer, userQuery);
      } catch (Exception e) {
        log.error("Error in startConversationWith: ", e);
      }
    }
  }

  /**
   * This method is called after the assistant has provided a response. It can be overridden to perform additional actions.
   * @param response The response from the assistant.
   * @return A string that can be used to provide an auto-response or null if no auto-response is needed.
   * This can be used to set up a follow-up question or action based on the assistant's response.
   * For example, if the assistant's response is a question, you might want to set up an auto-response to answer that question.
   * This is useful for chaining responses or automating follow-up actions.
   * To exit the conversation, return "exit".
   * @see #startConversationWith()
   */
  protected String onAssistantResponse(String response, String lastUserQuery) {
    return null;
  }
}
