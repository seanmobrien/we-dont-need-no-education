package com.obapps.core.ai.factory.types;

import com.obapps.core.ai.factory.models.AiServiceOptions;
import com.obapps.core.ai.factory.models.EmbeddingOptions;
import com.obapps.core.ai.factory.models.ModelType;
import dev.langchain4j.model.Tokenizer;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.embedding.EmbeddingModel;

/**
 * The ILanguageModelFactory interface provides methods for managing and creating
 * language model instances and related services. It allows setting and retrieving
 * a username, creating various types of language models, and creating service instances
 * with specified options.
 */
public interface ILanguageModelFactory {
  /**
   * Sets the username used when creating a model.
   *
   * @param userName the username to be set
   */
  public void setUserName(String userName);

  /**
   * Retrieves the username associated with this instance.
   *
   * @return the username as a {@code String}.
   */
  public String getUserName();

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
  public ChatLanguageModel createModel(ModelType modelType);

  /**
   * Creates an EmbeddingModel instance with default options.
   *
   * @return An EmbeddingModel instance.
   */
  public EmbeddingModel createEmbeddingModel();

  /**
   * Creates an EmbeddingModel instance with specified options.
   *
   * @param options The options to configure the embedding model.
   * @return An EmbeddingModel instance configured with the provided options.
   */
  public EmbeddingModel createEmbeddingModel(EmbeddingOptions options);

  /**
   * Creates an instance of the specified service class.
   *
   * @param <TService> The type of the service to be created.
   * @param options A set of options governing the service creation.
   * @return An instance of the specified service type.
   * @throws Exception If an error occurs during the creation of the service.
   */
  public <TService> TService createService(AiServiceOptions<TService> options);

  /**
   * Retrieves the tokenizer associated with the specified model type.
   *
   * @param modelType The type of the model for which the tokenizer is required.
   * @return The tokenizer corresponding to the given model type.
   */
  public Tokenizer getTokenizer(ModelType modelType);
}
