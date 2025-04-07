package com.obapps.schoolchatbot.assistants.services;

import com.obapps.schoolchatbot.util.EnvVars;
import com.obapps.schoolchatbot.util.EnvVars.OpenAiVars;
import dev.langchain4j.model.azure.AzureOpenAiChatModel;
import dev.langchain4j.model.chat.ChatLanguageModel;
import java.util.function.Function;

/**
 * Factory class for creating instances of {@link ChatLanguageModel} and {@link IStandaloneModelClient}.
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
public class StandaloneModelClientFactory {

  private EnvVars envVars;

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

  protected ChatLanguageModel createChatLlm(
    String endpoint,
    String deployment,
    String apiKey
  ) {
    // Completion Model for low-fidelity analysis
    return AzureOpenAiChatModel.builder()
      .apiKey(apiKey)
      .endpoint(endpoint)
      .deploymentName(deployment)
      .logRequestsAndResponses(true)
      .build();
  }

  protected ChatLanguageModel createLoFiClient() {
    // Completion Model for low-fidelity analysis
    return createChatLlm(
      openAiEnv(OpenAiVars::getApiEndpointCompletions),
      openAiEnv(OpenAiVars::getDeploymentCompletions),
      openAiEnv(OpenAiVars::getSearchApiKeyCompletions)
    );
  }

  protected ChatLanguageModel createHiFiClient() {
    // Completion Model for high-fidelity analysis
    return createChatLlm(
      openAiEnv(OpenAiVars::getApiEndpoint),
      openAiEnv(OpenAiVars::getDeploymentChat),
      openAiEnv(OpenAiVars::getApiKey)
    );
  }

  protected ChatLanguageModel createEmbeddingClient() {
    // Completion Model for high-fidelity analysis
    return createChatLlm(
      openAiEnv(OpenAiVars::getApiEndpoint),
      openAiEnv(OpenAiVars::getDeploymentEmbedding),
      openAiEnv(OpenAiVars::getApiKey)
    );
  }

  /**
   * Creates a ChatLanguageModel instance based on the specified model type.
   *
   * @param modelType The type of model to create. Supported types are:
   *                  - HiFi: High-fidelity language model.
   *                  - LoFi: Low-fidelity language model.
   *                  - Embedding: Embedding-based language model.
   * @return A ChatLanguageModel instance corresponding to the specified model type.
   * @throws IllegalArgumentException If the specified model type is unsupported.
   */
  public ChatLanguageModel createModel(ModelType modelType) {
    ChatLanguageModel llm = null;
    switch (modelType) {
      case HiFi:
        llm = createHiFiClient();
        break;
      case LoFi:
        llm = createLoFiClient();
        break;
      case Embedding:
        llm = createEmbeddingClient();
        break;
      default:
        throw new IllegalArgumentException(
          "Unsupported model type: " + modelType
        );
    }
    return llm;
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
   * Enum representing different types of models that can be used in the application.
   *
   * <ul>
   *   <li><b>Unknown</b>: Represents an unspecified or unrecognized model type.</li>
   *   <li><b>HiFi</b>: Represents a high-fidelity model, typically used for scenarios requiring high accuracy.</li>
   *   <li><b>LoFi</b>: Represents a low-fidelity model, typically used for scenarios where performance is prioritized over accuracy.</li>
   *   <li><b>Embedding</b>: Represents a model used for generating embeddings, often used in natural language processing tasks.</li>
   * </ul>
   */
  public enum ModelType {
    /**
     * Unknown model type.
     */
    Unknown,
    /**
     * High-fidelity model type.
     */
    HiFi,
    /**
     * Low-fidelity model type.
     */
    LoFi,
    /**
     * Embedding model type.
     */
    Embedding,
  }
}
