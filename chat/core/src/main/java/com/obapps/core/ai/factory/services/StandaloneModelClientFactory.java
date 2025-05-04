package com.obapps.core.ai.factory.services;

import com.azure.ai.openai.models.ChatCompletionsJsonResponseFormat;
import com.obapps.core.ai.factory.models.AiServiceOptions;
import com.obapps.core.ai.factory.models.EmbeddingOptions;
import com.obapps.core.ai.factory.models.ModelType;
import com.obapps.core.ai.factory.types.ILanguageModelFactory;
import com.obapps.core.ai.factory.types.IStandaloneModelClient;
import com.obapps.core.ai.telemetry.MetricsChatModelListener;
import com.obapps.core.ai.telemetry.SpanChatModelListener;
import com.obapps.core.util.EnvVars;
import com.obapps.core.util.EnvVars.OpenAiVars;
import dev.langchain4j.memory.chat.MessageWindowChatMemory;
import dev.langchain4j.model.TokenCountEstimator;
import dev.langchain4j.model.azure.AzureOpenAiChatModel;
import dev.langchain4j.model.azure.AzureOpenAiEmbeddingModel;
import dev.langchain4j.model.azure.AzureOpenAiTokenCountEstimator;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.service.AiServices;
import java.time.Duration;
import java.util.function.Function;

/**
 * Factory class for creating instances of {@link ChatModel} and {@link IStandaloneModelClient}.
 * This class provides methods to create different types of language models (HiFi, LoFi, and Embedding)
 * and encapsulates the logic for initializing these models with the appropriate configurations.
 *
 * <p>Usage:</p>
 * <pre>
 *   StandaloneModelClientFactory factory = new StandaloneModelClientFactory();
 *   IStandaloneModelClient client = factory.create(ModelType.HiFi);
 * </pre>
 *
 * <p>Supported Model Types:</p>
 * <ul>
 *   <li>HiFi: High-fidelity language model for detailed analysis.</li>
 *   <li>LoFi: Low-fidelity language model for lightweight analysis.</li>
 *   <li>Embedding: Embedding-based language model for vector representations.</li>
 * </ul>
 *
 * <p>Environment Variables:</p>
 * This factory relies on environment variables provided by {@link EnvVars} to configure
 * the models. If no environment variables are explicitly provided, the default instance
 * of {@link EnvVars} is used.
 *
 * <p>Thread Safety:</p>
 * This class is not thread-safe and should be used with caution in multi-threaded environments.
 */
public class StandaloneModelClientFactory implements ILanguageModelFactory {

  private EnvVars envVars;
  private String userName;

  @SuppressWarnings("unused")
  private static final MetricsChatModelListener MetricsChatModelListener =
    new MetricsChatModelListener();

  @SuppressWarnings("unused")
  private static final SpanChatModelListener SpanChatModelListener =
    new SpanChatModelListener();

  public StandaloneModelClientFactory() {
    this(null);
  }

  public StandaloneModelClientFactory(EnvVars environment) {
    super();
    this.envVars = environment == null ? EnvVars.getInstance() : environment;
  }

  protected String openAiEnv(Function<OpenAiVars, String> func) {
    return func.apply(envVars.getOpenAi());
  }

  protected EmbeddingModel createEmbeddingLlm(
    String endpoint,
    String deployment,
    String apiKey,
    Integer dimensions
  ) {
    String normalEndpoint = endpoint.endsWith("/")
      ? endpoint.substring(0, endpoint.length() - 1)
      : endpoint;

    boolean isDebugMode = true;

    var builder = AzureOpenAiEmbeddingModel.builder()
      .apiKey(apiKey)
      .endpoint(normalEndpoint)
      .dimensions(dimensions)
      .deploymentName(deployment)
      .timeout(Duration.ofMillis(2 * 60 * 1000))
      .logRequestsAndResponses(isDebugMode);

    var model = builder.build();
    return model;
  }

  protected ChatModel createChatLlm(
    String endpoint,
    String deployment,
    String apiKey
  ) {
    return createChatLlm(endpoint, deployment, apiKey, null);
  }

  protected ChatModel createChatLlm(
    String endpoint,
    String deployment,
    String apiKey,
    Function<
      AzureOpenAiChatModel.Builder,
      AzureOpenAiChatModel.Builder
    > builderFunc
  ) {
    String normalEndpoint = endpoint.endsWith("/")
      ? endpoint.substring(0, endpoint.length() - 1)
      : endpoint;

    /*
    var runtimeArg = java.lang.management.ManagementFactory.getRuntimeMXBean()
      .getInputArguments()
      .toString();
    */
    boolean isDebugMode = true;

    var builder = AzureOpenAiChatModel.builder()
      .apiKey(apiKey)
      .endpoint(normalEndpoint)
      .deploymentName(deployment)
      .timeout(Duration.ofMillis(2 * 60 * 1000))
      .logRequestsAndResponses(isDebugMode); //.listeners(List.of(SpanChatModelListener, MetricsChatModelListener))

    if (userName != null) {
      builder.user(userName);
    }
    if (builderFunc != null) {
      builder = builderFunc.apply(builder);
    }
    var model = builder.build();
    return model;
  }

  protected ChatModel createLoFiClient() {
    // Completion Model for low-fidelity analysis
    return createChatLlm(
      openAiEnv(OpenAiVars::getApiEndpointCompletions),
      openAiEnv(OpenAiVars::getDeploymentCompletions),
      openAiEnv(OpenAiVars::getSearchApiKeyCompletions)
    );
  }

  protected ChatModel createLoFiClient(
    Function<
      AzureOpenAiChatModel.Builder,
      AzureOpenAiChatModel.Builder
    > builderFunc
  ) {
    return createChatLlm(
      openAiEnv(OpenAiVars::getApiEndpointCompletions),
      openAiEnv(OpenAiVars::getDeploymentCompletions),
      openAiEnv(OpenAiVars::getSearchApiKeyCompletions),
      builderFunc
    );
  }

  protected ChatModel createHiFiClient() {
    // Completion Model for high-fidelity analysis
    return createChatLlm(
      openAiEnv(OpenAiVars::getApiEndpoint),
      openAiEnv(OpenAiVars::getDeploymentChat),
      openAiEnv(OpenAiVars::getApiKey)
    );
  }

  protected ChatModel createHiFiClient(
    Function<
      AzureOpenAiChatModel.Builder,
      AzureOpenAiChatModel.Builder
    > builderFunc
  ) {
    return createChatLlm(
      openAiEnv(OpenAiVars::getApiEndpoint),
      openAiEnv(OpenAiVars::getDeploymentChat),
      openAiEnv(OpenAiVars::getApiKey),
      builderFunc
    );
  }

  /**
   * Sets the username for the current instance.
   *
   * @param userName the username to be set
   */
  public void setUserName(String userName) {
    this.userName = userName;
  }

  /**
   * Retrieves the username associated with this instance.
   *
   * @return the username as a {@code String}.
   */
  public String getUserName() {
    return this.userName;
  }

  /**
   * Creates a ChatModel instance based on the specified model type.
   *
   * @param modelType The type of model to create. Supported types are:
   *                  - HiFi: High-fidelity language model.
   *                  - LoFi: Low-fidelity language model.
   *                  - Embedding: Embedding-based language model.
   * @return A ChatModel instance corresponding to the specified model type.
   * @throws IllegalArgumentException If the specified model type is unsupported.
   */
  public ChatModel createModel(ModelType modelType) {
    ChatModel llm = null;
    switch (modelType) {
      case HiFi:
        llm = createHiFiClient();
        break;
      case LoFi:
        llm = createLoFiClient();
        break;
      default:
        throw new IllegalArgumentException(
          "Unsupported model type: " + modelType
        );
    }
    return llm;
  }

  protected ChatModel createModel(
    ModelType modelType,
    Function<
      AzureOpenAiChatModel.Builder,
      AzureOpenAiChatModel.Builder
    > builderFunc
  ) {
    ChatModel llm = null;
    switch (modelType) {
      case HiFi:
        llm = createHiFiClient(builderFunc);
        break;
      case LoFi:
        llm = createLoFiClient(builderFunc);
        break;
      default:
        throw new IllegalArgumentException(
          "Unsupported model type: " + modelType
        );
    }
    return llm;
  }

  @Override
  public TokenCountEstimator getTokenCountEstimator(ModelType modelType) {
    return new AzureOpenAiTokenCountEstimator(
      EnvVars.getInstance().getOpenAi().getDeploymentEmbedding()
    );
  }

  /**
   * Creates and returns an instance of the EmbeddingModel.
   * This method delegates the creation process to the createEmbeddingClient method.
   *
   * @return an instance of EmbeddingModel
   */
  public EmbeddingModel createEmbeddingModel() {
    return createEmbeddingModel(null);
  }

  public EmbeddingModel createEmbeddingModel(EmbeddingOptions options) {
    if (options == null) {
      options = EmbeddingOptions.builder().build();
    }
    // Completion Model for high-fidelity analysis
    return createEmbeddingLlm(
      openAiEnv(OpenAiVars::getApiEndpointEmbedding),
      openAiEnv(OpenAiVars::getDeploymentEmbedding),
      openAiEnv(OpenAiVars::getApiKey),
      options.dimensions
    );
  }

  /**
   * Creates an instance of {@link IStandaloneModelClient} based on the specified model type.
   *
   * @param modelType The type of the model to be used for creating the client.
   * @return A new instance of {@link IStandaloneModelClient} initialized with the specified model.
   */
  public IStandaloneModelClient create(ModelType modelType) {
    return new StandaloneModelClient(createModel(modelType));
  }

  /**
   * Creates and returns a new instance of the {@link Builder} class.
   * This method provides a convenient way to initialize and configure
   * a {@link Builder} for constructing instances of the enclosing class.
   *
   * @return a new {@link Builder} instance
   */
  public static Builder builder() {
    return new Builder();
  }

  /**
   * Builder class for constructing instances of {@link StandaloneModelClientFactory}.
   * This class provides a fluent API for setting configuration options and creating
   * a fully initialized {@link StandaloneModelClientFactory} instance.
   */
  public static class Builder {

    private EnvVars envVars;
    private String userName;

    /**
     * Sets the {@link EnvVars} instance to be used by the factory.
     *
     * @param envVars the {@link EnvVars} instance to set
     * @return the current {@link Builder} instance for method chaining
     */
    public Builder setEnvVars(EnvVars envVars) {
      this.envVars = envVars;
      return this;
    }

    /**
     * Sets the username to be associated with the factory.
     *
     * @param userName the username to set
     * @return the current {@link Builder} instance for method chaining
     */
    public Builder setUserName(String userName) {
      this.userName = userName;
      return this;
    }

    /**
     * Builds and returns a new instance of {@link StandaloneModelClientFactory}.
     *
     * @return a fully initialized {@link StandaloneModelClientFactory} instance
     */
    public StandaloneModelClientFactory build() {
      StandaloneModelClientFactory factory = new StandaloneModelClientFactory(
        envVars
      );
      if (userName != null) {
        factory.setUserName(userName);
      }
      return factory;
    }
  }

  // Removed duplicate method to resolve type erasure conflict

  @Override
  public <TService> TService createService(AiServiceOptions<TService> options) {
    @SuppressWarnings("removal")
    var model = createModel(options.modelType, b -> {
      if (options.structuredOutput) {
        b.responseFormat(new ChatCompletionsJsonResponseFormat());
      }
      return b;
    });
    var builder = AiServices.builder(options.getClazz()).chatModel(model);
    if (options.memoryWindow != null && options.memoryWindow > 0) {
      builder.chatMemory(
        MessageWindowChatMemory.withMaxMessages(options.memoryWindow)
      );
    }
    if (options.onSetup != null) {
      options.onSetup.accept(builder);
    }

    return builder.build();
  }
}
