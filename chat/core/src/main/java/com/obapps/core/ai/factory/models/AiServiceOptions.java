package com.obapps.core.ai.factory.models;

import dev.langchain4j.service.AiServices;
import java.util.function.Consumer;

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
public class AiServiceOptions<TService> {

  /**
   * Indicates whether the output should be structured.
   */
  public boolean structuredOutput;

  /**
   * Specifies the model type to be used.
   */
  public ModelType modelType = ModelType.LoFi;

  /**
   * Defines the memory window size for the service.
   */
  public Integer memoryWindow = 0;

  /**
   * A callback that is invoked during the setup of the service options.
   */
  public Consumer<AiServices<TService>> onSetup = null;

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
    private ModelType modelType = ModelType.LoFi;

    /**
     * Indicates whether the output should be structured.
     */
    private boolean structuredOutput = false;

    /**
     * The memory window size for the service.
     */
    private Integer memoryWindow = 0;

    /**
     * A callback that is invoked during the setup of the service options.
     */
    private Consumer<AiServices<TService>> setupCallback = null;

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
    public <T extends Builder<TService>> T setStructuredOutput(
      boolean structuredOutput
    ) {
      this.structuredOutput = structuredOutput;
      return self();
    }

    /**
     * Sets a callback to be invoked during the setup of the service options.
     *
     * @param setupCallback The setup callback.
     * @param <T>           The type of the builder.
     * @return The builder instance.
     */
    public <T extends Builder<TService>> T onSetup(
      Consumer<AiServices<TService>> setupCallback
    ) {
      this.setupCallback = setupCallback;
      return self();
    }

    /**
     * Sets the model type to be used.
     *
     * @param modelType The model type.
     * @param <T>       The type of the builder.
     * @return The builder instance.
     */
    public <T extends Builder<TService>> T setModelType(ModelType modelType) {
      this.modelType = modelType;
      return self();
    }

    /**
     * Sets the memory window size for the service.
     *
     * @param memoryWindow The memory window size.
     * @param <T>          The type of the builder.
     * @return The builder instance.
     */
    public <T extends Builder<TService>> T setMemoryWindow(
      Integer memoryWindow
    ) {
      if (memoryWindow != null) {
        this.memoryWindow = memoryWindow;
      }
      return self();
    }

    /**
     * Copies the configuration from an existing AiServiceOptions instance.
     *
     * @param source The source AiServiceOptions instance.
     * @param <T>    The type of the builder.
     * @return The builder instance.
     */
    public <T extends Builder<TService>> T copy(
      AiServiceOptions<TService> source
    ) {
      this.structuredOutput = source.structuredOutput;
      this.modelType = source.modelType;
      this.memoryWindow = source.memoryWindow;
      return self();
    }

    /**
     * Builds a new AiServiceOptions instance with the configured parameters.
     *
     * @param <TOps> The type of the AiServiceOptions instance.
     * @return A new AiServiceOptions instance.
     */
    @SuppressWarnings("unchecked")
    public <TOps extends AiServiceOptions<TService>> TOps build() {
      var ret = (TOps) new AiServiceOptions<TService>(
        clazz,
        structuredOutput,
        modelType,
        memoryWindow
      );
      ret.onSetup = this.setupCallback;
      return ret;
    }

    /**
     * Returns the current builder instance.
     *
     * @param <T> The type of the builder.
     * @return The builder instance.
     */
    @SuppressWarnings({ "unchecked" })
    private <T extends Builder<TService>> T self() {
      return (T) this;
    }
  }
}
