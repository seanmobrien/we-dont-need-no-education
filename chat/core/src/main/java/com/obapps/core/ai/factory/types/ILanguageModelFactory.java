package com.obapps.core.ai.factory.types;

import com.obapps.core.ai.factory.models.AiServiceOptions;
import com.obapps.core.ai.factory.models.ModelType;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.embedding.EmbeddingModel;

/**
 * The ILanguageModelFactory interface provides methods for managing and creating
 * language model instances and related services. It allows setting and retrieving
 * a username, creating various types of language models, and creating service instances
 * with specified options.
 *
 * <p>Key functionalities include:</p>
 * <ul>
 *   <li>Setting and retrieving the username associated with the factory instance.</li>
 *   <li>Creating language models of different types, such as HiFi, LoFi, and Embedding models.</li>
 *   <li>Creating embedding models for specialized use cases.</li>
 *   <li>Creating service instances of a specified type with configurable options.</li>
 * </ul>
 *
 * <p>Implementations of this interface are expected to handle the creation logic
 * for language models and services, and to validate input parameters where necessary.</p>
 *
 * <p>Exceptions:</p>
 * <ul>
 *   <li>{@link IllegalArgumentException} is thrown if an unsupported model type is specified.</li>
 *   <li>{@link Exception} is thrown if an error occurs during service creation.</li>
 * </ul>
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
   * Creates a ChatLanguageModel instance based on the specified model type.
   *
   * @param modelType The type of model to create. Supported types are:
   *                  - HiFi: High-fidelity language model.
   *                  - LoFi: Low-fidelity language model.
   *                  - Embedding: Embedding-based language model.
   * @return A ChatLanguageModel instance corresponding to the specified model type.
   * @throws IllegalArgumentException If the specified model type is unsupported.
   */
  public EmbeddingModel createEmbeddingModel();

  /**
   * Creates an instance of the specified service class.
   *
   * @param <TService> The type of the service to be created.
   * @param options A set of options governing the service creation.
   * @return An instance of the specified service type.
   * @throws Exception If an error occurs during the creation of the service.
   */
  public <TService> TService createService(AiServiceOptions<TService> options);
}
