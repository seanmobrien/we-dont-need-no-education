package com.obapps.schoolchatbot.core.services;

import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.embedding.EmbeddingModel;

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
   * @param clazz The class object representing the type of the service to be created.
   * @return An instance of the specified service type.
   * @throws Exception If an error occurs during the creation of the service.
   */
  public <TService> TService createService(Class<TService> clazz);

  /**
   * Creates an instance of the specified service class.
   *
   * @param <TService> The type of the service to be created.
   * @param clazz The class object representing the type of the service to be created.
   * @param options A set of options governing the service creation.
   * @return An instance of the specified service type.
   * @throws Exception If an error occurs during the creation of the service.
   */
  public <TService> TService createService(
    Class<TService> clazz,
    AiServiceOptions options
  );
}
