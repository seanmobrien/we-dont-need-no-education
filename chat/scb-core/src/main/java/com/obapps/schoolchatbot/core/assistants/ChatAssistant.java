package com.obapps.schoolchatbot.core.assistants;

import com.obapps.core.ai.factory.models.ModelType;
import com.obapps.core.ai.factory.services.StandaloneModelClientFactory;
import com.obapps.core.ai.factory.types.ILanguageModelFactory;
import com.obapps.core.util.Colors;
import com.obapps.schoolchatbot.core.assistants.retrievers.SourceDocumentRetriever;
import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.memory.ChatMemory;
import dev.langchain4j.memory.chat.MessageWindowChatMemory;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.moderation.Moderation;
import dev.langchain4j.model.moderation.ModerationModel;
import dev.langchain4j.model.output.Response;
import dev.langchain4j.rag.DefaultRetrievalAugmentor;
import dev.langchain4j.rag.DefaultRetrievalAugmentor.DefaultRetrievalAugmentorBuilder;
import dev.langchain4j.rag.RetrievalAugmentor;
import dev.langchain4j.rag.content.retriever.ContentRetriever;
import dev.langchain4j.rag.query.router.DefaultQueryRouter;
import dev.langchain4j.service.AiServices;
import dev.langchain4j.service.Result;
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

  protected EmbeddingModel _embeddingModel;
  protected ChatModel ChatModel;
  protected Assistant assistant;
  protected Logger log;
  protected Boolean includeReplyTo;

  protected String getUserName() {
    return this.languageModelFactory.getUserName();
  }

  protected ChatAssistant() {
    this(null);
  }

  private final ILanguageModelFactory languageModelFactory;

  protected ChatAssistant(ILanguageModelFactory languageModelFactory) {
    this.log = LoggerFactory.getLogger(this.getClass());
    this.languageModelFactory = languageModelFactory == null
      ? new StandaloneModelClientFactory()
      : languageModelFactory;
    // Generate username
    this.languageModelFactory.setUserName(
        String.format(
          "%s-%05d",
          this.getClass().getSimpleName(),
          (int) (Math.random() * 100000)
        )
      );
    // Chat Model for high-fidelity analysis
    this.ChatModel = this.languageModelFactory.createModel(ModelType.HiFi);
    messageWindowMemory = MessageWindowChatMemory.withMaxMessages(100);
    this.includeReplyTo = false;
  }

  protected final EmbeddingModel getEmbeddingModel() {
    if (this._embeddingModel != null) {
      return this._embeddingModel;
    }
    this._embeddingModel = this.languageModelFactory.createEmbeddingModel();
    // Return embedding model
    return this._embeddingModel;
  }

  protected final RetrievalAugmentor getRetrievalAugmentor() {
    var retrievalAugmentorBuilder = prepareRetrievalAugmentor(
      DefaultRetrievalAugmentor.builder()
    );
    return retrievalAugmentorBuilder == null
      ? null
      : retrievalAugmentorBuilder.build();
  }

  protected MessageWindowChatMemory messageWindowMemory;

  protected final <TService> TService getAiService(Class<TService> clazz) {
    return prepareAssistantService(
      AiServices.builder(clazz)
        .chatModel(ChatModel)
        .maxSequentialToolsInvocations(100)
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
      messageWindowMemory
    ).build();
  }

  protected final Assistant getAssistant() {
    if (this.assistant != null) {
      return this.assistant;
    }
    // Create assistant with support for overridden configuration
    this.assistant = getAiService(Assistant.class);
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
    var sourceDocRetriever = new SourceDocumentRetriever();
    if (this.includeReplyTo) {
      sourceDocRetriever.setIncludeReplyTo(true);
    }
    retrievers.add(sourceDocRetriever);
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
        var agentResult = getAssistant().answer(userQuery);
        Colors.Set(c -> c.PURPLE);
        log.info("==================================================");
        log.info("Assistant: " + agentResult.content());
        Colors.Set(c -> c.RESET);
        autoResponse = onAssistantResponse(agentResult, userQuery);
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
  protected String onAssistantResponse(
    Result<String> response,
    String lastUserQuery
  ) {
    return null;
  }
}
