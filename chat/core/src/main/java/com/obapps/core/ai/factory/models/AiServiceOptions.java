package com.obapps.core.ai.factory.models;

import dev.langchain4j.model.azure.AzureOpenAiChatModel;
import dev.langchain4j.service.AiServices;
import java.util.function.Consumer;
import java.util.function.Function;

/**
 * Represents configuration options for an AI service.
 *
 * @param <TService> The type of the service being configured.
 *
 * <p>This class provides various configuration options for setting up an AI service,
 * including the model type, memory window size, structured output flag, and a setup callback.
 * It also includes a builder for constructing instances of this class in a fluent manner.</p>
 *
 * <h2>Key Features:</h2>
 * <ul>
 *   <li>Structured Output: Indicates whether the output should be structured.</li>
 *   <li>Model Type: Specifies the model type to be used (e.g., LoFi, HiFi).</li>
 *   <li>Memory Window: Defines the memory window size for the service.</li>
 *   <li>Setup Callback: Allows specifying a callback to be invoked during setup.</li>
 *   <li>Builder Pattern: Provides a builder for creating instances with a fluent API.</li>
 * </ul>
 *
 * <h2>Usage Example:</h2>
 * <pre>{@code
 * AiServiceOptions<MyService> options = AiServiceOptions.builder(MyService.class)
 *     .setStructuredOutput(true)
 *     .setModelType(ModelType.HiFi)
 *     .setMemoryWindow(1024)
 *     .onSetup(service -> {
 *         // Custom setup logic
 *     })
 *     .build();
 * }</pre>
 *
 * <h2>Thread Safety:</h2>
 * <p>This class is not thread-safe. If multiple threads access an instance of this class
 * concurrently, external synchronization is required.</p>
 */
public class AiServiceOptions<TService> extends ChatModelOptionsBase {

  /**
   * Indicates whether the output should be structured.
   */
  public boolean structuredOutput;

  /**
   * Defines the memory window size for the service.
   */
  public Integer memoryWindow = 0;

  /**
   * A callback that is invoked during the setup of the service options.
   */
  public Consumer<AiServices<TService>> onSetupServiceCallback = null;

  /**
   * The class type of the service being configured.
   */
  private final Class<TService> clazz;

  /**
   * Constructs an instance of AiServiceOptions with the specified service class.
   *
   * @param clazz The class type of the service.
   */
  public AiServiceOptions(Class<TService> clazz) {
    this(clazz, false);
  }

  /**
   * Constructs an instance of AiServiceOptions with the specified service class
   * and structured output flag.
   *
   * @param clazz            The class type of the service.
   * @param structuredOutput Whether the output should be structured.
   */
  public AiServiceOptions(Class<TService> clazz, boolean structuredOutput) {
    this(clazz, structuredOutput, ModelType.LoFi, 0);
  }

  /**
   * Constructs an instance of AiServiceOptions with the specified parameters.
   *
   * @param clazz            The class type of the service.
   * @param structuredOutput Whether the output should be structured.
   * @param modelType        The model type to be used.
   * @param memoryWindow     The memory window size.
   */
  public AiServiceOptions(
    Class<TService> clazz,
    boolean structuredOutput,
    ModelType modelType,
    Integer memoryWindow
  ) {
    this.clazz = clazz;
    this.structuredOutput = structuredOutput;
    this.modelType = modelType;
    this.memoryWindow = memoryWindow;
  }

  /**
   * Gets the class type of the service being configured.
   *
   * @return The class type of the service.
   */
  public Class<TService> getClazz() {
    return clazz;
  }

  /**
   * Creates a new builder for configuring AiServiceOptions.
   *
   * @param <TService> The type of the service being configured.
   * @param clazz      The class type of the service.
   * @return A new Builder instance.
   */
  public static <TService> Builder<TService> builder(Class<TService> clazz) {
    return new Builder<TService>(clazz);
  }

  /**
   * Creates a new builder for configuring AiServiceOptions.
   *
   * @param <TService> The type of the service being configured.
   * @param clazz      The class type of the service.
   * @return A new Builder instance.
   */
  public static <TService> Builder<TService> builder(
    AiServiceOptions<TService> options
  ) {
    return new Builder<TService>(options.getClazz()).copy(options);
  }

  /**
   * A builder class for constructing AiServiceOptions instances.
   *
   * @param <TService> The type of the service being configured.
   */
  public static class Builder<TService> {

    /**
     * The class type of the service being configured.
     */
    private final Class<TService> clazz;

    /**
     * The model type to be used.
     */
    private ModelType modelType = ModelType.HiFi;

    /**
     * Indicates whether the output should be structured.
     */
    private boolean structuredOutput = false;

    /**
     * The memory window size for the service.
     */
    private Integer memoryWindow = 0;

    private Double temperature = null;

    /**
     * A callback that is invoked during the setup of the service options.
     */
    private Consumer<AiServices<TService>> setupCallback = null;

    private Function<
      AzureOpenAiChatModel.Builder,
      AzureOpenAiChatModel.Builder
    > setupModelCallback;

    /**
     * Constructs a Builder instance with the specified service class.
     *
     * @param clazz The class type of the service.
     */
    protected Builder(Class<TService> clazz) {
      this.clazz = clazz;
    }

    /**
     * Gets the class type of the service being configured.
     *
     * @return The class type of the service.
     */
    public Class<TService> getClazz() {
      return clazz;
    }

    /**
     * Sets whether the output should be structured.
     *
     * @param structuredOutput Whether the output should be structured.
     * @param <T>              The type of the builder.
     * @return The builder instance.
     */
    public Builder<TService> setStructuredOutput(boolean structuredOutput) {
      this.structuredOutput = structuredOutput;
      return this;
    }

    /**
     * Sets a callback to be invoked during the setup of the service options.
     *
     * @param setupServiceCallback The setup callback.
     * @param <T>           The type of the builder.
     * @return The builder instance.
     */
    public Builder<TService> onSetupModel(
      Function<
        AzureOpenAiChatModel.Builder,
        AzureOpenAiChatModel.Builder
      > setupModelCallback
    ) {
      this.setupModelCallback = setupModelCallback;
      return this;
    }

    /**
     * Sets a callback to be invoked during the setup of the service options.
     *
     * @param setupServiceCallback The setup callback.
     * @param <T>           The type of the builder.
     * @return The builder instance.
     */
    public Builder<TService> onSetupService(
      Consumer<AiServices<TService>> setupServiceCallback
    ) {
      this.setupCallback = setupServiceCallback;
      return this;
    }

    /**
     * Sets the model type to be used.
     *
     * @param modelType The model type.
     * @param <T>       The type of the builder.
     * @return The builder instance.
     */
    public Builder<TService> setModelType(ModelType modelType) {
      this.modelType = modelType;
      return this;
    }

    /**
     * Sets the temperature value for the AI service options.
     *
     * @param temperature the temperature value to set. If null, the current value remains unchanged.
     * @return the Builder instance for chaining method calls.
     */
    public Builder<TService> setTemperature(Double temperature) {
      if (temperature != null) {
        this.temperature = temperature;
      }
      return this;
    }

    /**
     * Sets the memory window size for the service.
     *
     * @param memoryWindow The memory window size.
     * @param <T>          The type of the builder.
     * @return The builder instance.
     */
    public Builder<TService> setMemoryWindow(Integer memoryWindow) {
      if (memoryWindow != null) {
        this.memoryWindow = memoryWindow;
      }
      return this;
    }

    /**
     * Copies the configuration from an existing AiServiceOptions instance.
     *
     * @param source The source AiServiceOptions instance.
     * @param <T>    The type of the builder.
     * @return The builder instance.
     */
    public Builder<TService> copy(ChatModelOptionsBase source) {
      this.modelType = source.modelType;
      this.temperature = source.temperature;
      this.setupModelCallback = source.onSetupModelCallback;

      if (source instanceof AiServiceOptions<?>) {
        @SuppressWarnings("unchecked")
        var aiSource = (AiServiceOptions<TService>) source;
        this.structuredOutput = aiSource.structuredOutput;
        this.memoryWindow = aiSource.memoryWindow;
        this.setupCallback = aiSource.onSetupServiceCallback;
      }

      return this;
    }

    /**
     * Builds a new AiServiceOptions instance with the configured parameters.
     *
     * @param <TOps> The type of the AiServiceOptions instance.
     * @return A new AiServiceOptions instance.
     */
    public AiServiceOptions<TService> build() {
      var ret = new AiServiceOptions<TService>(
        clazz,
        this.structuredOutput,
        this.modelType,
        this.memoryWindow
      );
      ret.temperature = this.temperature;
      ret.onSetupServiceCallback = this.setupCallback;
      ret.onSetupModelCallback = this.setupModelCallback;
      return ret;
    }
  }
}
