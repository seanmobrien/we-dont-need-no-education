package assistants;

import data.Colors;
import dev.langchain4j.memory.ChatMemory;
import dev.langchain4j.memory.chat.MessageWindowChatMemory;
import dev.langchain4j.model.azure.AzureOpenAiChatModel;
import dev.langchain4j.model.azure.AzureOpenAiEmbeddingModel;
import dev.langchain4j.rag.DefaultRetrievalAugmentor;
import dev.langchain4j.rag.DefaultRetrievalAugmentor.DefaultRetrievalAugmentorBuilder;
import dev.langchain4j.rag.RetrievalAugmentor;
import dev.langchain4j.rag.content.retriever.azure.search.AzureAiSearchContentRetriever;
import dev.langchain4j.rag.content.retriever.azure.search.AzureAiSearchQueryType;
import dev.langchain4j.rag.query.router.DefaultQueryRouter;
import dev.langchain4j.service.AiServices;
import java.util.Scanner;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import util.Assistant;
import util.DocumentEmbedder;
import util.EnvVars;

public class ChatAssistant {

  protected AzureOpenAiEmbeddingModel embeddingModel;
  protected AzureOpenAiChatModel chatLanguageModel;
  protected AzureOpenAiChatModel completionLanguageModel;
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
      .build();

    // Chat Model for high-fidelity analysis
    this.chatLanguageModel = AzureOpenAiChatModel.builder()
      .apiKey(openAiVars.getApiKey())
      .endpoint(openAiVars.getApiEndpoint())
      .deploymentName(openAiVars.getDeploymentChat())
      .logRequestsAndResponses(true)
      .build();

    // Completion Model for low-fidelity analysis
    this.completionLanguageModel = AzureOpenAiChatModel.builder()
      .apiKey(openAiVars.getSearchApiKeyCompletions())
      .endpoint(openAiVars.getApiEndpointCompletions())
      .deploymentName(openAiVars.getDeploymentCompletions())
      .logRequestsAndResponses(true)
      .build();
  }

  protected final AzureAiSearchContentRetriever getEmailSearchRetriever() {
    var openAiVars = EnvVars.getInstance().getOpenAi();
    var emailRetrieverBuilder = prepareEmailSearchRetriever(
      AzureAiSearchContentRetriever.builder()
        .apiKey(openAiVars.getSearchApiKey())
        .endpoint(openAiVars.getSearchApiEndpoint())
        .dimensions(1536)
        .indexName(openAiVars.getSearchIndexName())
        .createOrUpdateIndex(false)
        .embeddingModel(embeddingModel)
        .queryType(AzureAiSearchQueryType.HYBRID_WITH_RERANKING)
    );
    return emailRetrieverBuilder == null ? null : emailRetrieverBuilder.build();
  }

  protected final AzureAiSearchContentRetriever getPolicyRetriever() {
    var openAiVars = EnvVars.getInstance().getOpenAi();
    var policyRetrieverBuilder = preparePolicySearchRetriever(
      AzureAiSearchContentRetriever.builder()
        .apiKey(openAiVars.getSearchApiKey())
        .endpoint(openAiVars.getSearchApiEndpoint())
        .dimensions(1536)
        .indexName(openAiVars.getPolicySearchIndexName())
        .createOrUpdateIndex(false)
        .embeddingModel(embeddingModel)
        .queryType(AzureAiSearchQueryType.HYBRID_WITH_RERANKING)
    );
    return policyRetrieverBuilder == null
      ? null
      : policyRetrieverBuilder.build();
  }

  protected final RetrievalAugmentor getRetrievalAugmentor() {
    var retrievalAugmentorBuilder = prepareRetrievalAugmentor(
      DefaultRetrievalAugmentor.builder(),
      getPolicyRetriever(),
      getEmailSearchRetriever()
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
      AiServices.builder(Assistant.class).chatLanguageModel(chatLanguageModel),
      getRetrievalAugmentor(),
      MessageWindowChatMemory.withMaxMessages(10)
    ).build();
    // Return assistant
    return this.assistant;
  }

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

  protected AzureAiSearchContentRetriever.Builder preparePolicySearchRetriever(
    AzureAiSearchContentRetriever.Builder builder
  ) {
    return builder.maxResults(20);
  }

  protected AzureAiSearchContentRetriever.Builder prepareEmailSearchRetriever(
    AzureAiSearchContentRetriever.Builder builder
  ) {
    return builder.maxResults(15);
  }

  protected DefaultRetrievalAugmentorBuilder prepareRetrievalAugmentor(
    DefaultRetrievalAugmentorBuilder builder,
    AzureAiSearchContentRetriever policyRetriever,
    AzureAiSearchContentRetriever emailRetriever
  ) {
    // Setup either a contentRetriever or a query router depending on which retrievers were built
    if (policyRetriever == null) {
      if (emailRetriever != null) {
        builder.contentRetriever(emailRetriever);
      }
    } else if (emailRetriever == null) {
      builder.contentRetriever(policyRetriever);
    } else {
      builder.queryRouter(
        new DefaultQueryRouter(emailRetriever, policyRetriever)
      );
    }
    return builder;
  }

  private String autoResponse;

  @SuppressWarnings("unchecked")
  protected <T extends ChatAssistant> T setAutoResponse(String autoResponse) {
    this.autoResponse = autoResponse;
    return (T) this;
  }

  protected void startConversationWith() {
    Logger log = LoggerFactory.getLogger(this.getClass());
    try (Scanner scanner = new Scanner(System.in)) {
      while (true) {
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

        if ("exit".equalsIgnoreCase(userQuery)) {
          break;
        }

        String agentAnswer = getAssistant().answer(userQuery);
        Colors.Set(c -> c.PURPLE);
        log.info("==================================================");
        log.info("Assistant: " + agentAnswer);
        Colors.Set(c -> c.RESET);
        autoResponse = onAssistantResponse(agentAnswer, userQuery);
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
