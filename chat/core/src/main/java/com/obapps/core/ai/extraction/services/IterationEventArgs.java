package com.obapps.core.ai.extraction.services;

import com.obapps.core.ai.extraction.models.IRecordExtractionEnvelope;
import dev.langchain4j.service.Result;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Represents the arguments for an iteration event in the extraction process.
 *
 * @param <TRecord> The type of the record being processed.
 * @param <TEnvelope> The type of the envelope containing the records.
 */
public class IterationEventArgs<
  TRecord, TEnvelope extends IRecordExtractionEnvelope<TRecord>
> {

  /**
   * The result of the current iteration.
   */
  private final Result<TEnvelope> iterationResult;

  /**
   * The aggregated result of all iterations so far.
   */
  private final Result<List<TRecord>> aggregateResult;

  /**
   * The current iteration number.
   */
  private final int iteration;

  /**
   * The service associated with the iteration.
   */
  private final Object service;

  /**
   * Additional properties associated with the iteration.
   */
  private final Map<String, Object> properties;

  /**
   * Constructs an IterationEventArgs instance with the specified parameters.
   *
   * @param service The service associated with the iteration.
   * @param iterationResult The result of the current iteration.
   * @param aggregateResult The aggregated result of all iterations so far.
   * @param iteration The current iteration number.
   */
  public IterationEventArgs(
    Object service,
    Result<TEnvelope> iterationResult,
    Result<List<TRecord>> aggregateResult,
    int iteration
  ) {
    this(service, iterationResult, aggregateResult, iteration, null);
  }

  /**
   * Constructs an IterationEventArgs instance with the specified parameters.
   *
   * @param service The service associated with the iteration.
   * @param iterationResult The result of the current iteration.
   * @param aggregateResult The aggregated result of all iterations so far.
   * @param iteration The current iteration number.
   * @param properties Additional properties associated with the iteration.
   */
  public IterationEventArgs(
    Object service,
    Result<TEnvelope> iterationResult,
    Result<List<TRecord>> aggregateResult,
    int iteration,
    Map<String, Object> properties
  ) {
    this.service = service;
    this.iterationResult = iterationResult;
    this.aggregateResult = aggregateResult;
    this.iteration = iteration;
    this.properties = properties == null
      ? new HashMap<>()
      : new HashMap<>(properties);
  }

  /**
   * Gets the result of the current iteration.
   *
   * @return The result of the current iteration.
   */
  public Result<
    ? extends IRecordExtractionEnvelope<TRecord>
  > getIterationResult() {
    return iterationResult;
  }

  /**
   * Gets the aggregated result of all iterations so far.
   *
   * @return The aggregated result of all iterations so far.
   */
  public Result<List<TRecord>> getAggregateResult() {
    return aggregateResult;
  }

  /**
   * Gets the current iteration number.
   *
   * @return The current iteration number.
   */
  public int getIteration() {
    return iteration;
  }

  /**
   * Gets the number of new records in the current iteration.
   *
   * @return The number of new records in the current iteration.
   */
  public int getNewRecords() {
    return iterationResult.content().getResults().size();
  }

  /**
   * Checks if the iteration has signaled completion.
   *
   * @return True if the iteration has signaled completion, otherwise false.
   */
  public boolean getHasSignaledComplete() {
    return iterationResult.content().getAllRecordsEmitted();
  }

  /**
   * Gets the estimated number of items remaining to be processed.
   *
   * @return The estimated number of items remaining to be processed.
   */
  public int getEstimatedItemsRemaining() {
    return iterationResult.content().getMoreResultsAvailable();
  }

  /**
   * Gets the service associated with the iteration.
   *
   * @return The service associated with the iteration.
   */
  public Object getService() {
    return service;
  }

  /**
   * Gets a property by its key.
   *
   * @param <TProperty> The type of the property value.
   * @param key The key of the property.
   * @return The value of the property, or null if not found.
   */
  public <TProperty> TProperty getProperty(String key) {
    return getProperty(key, null);
  }

  /**
   * Gets a property by its key, with a default value.
   *
   * @param <TProperty> The type of the property value.
   * @param key The key of the property.
   * @param defaultValue The default value to return if the property is not found.
   * @return The value of the property, or the default value if not found.
   */
  @SuppressWarnings("unchecked")
  public <TProperty> TProperty getProperty(String key, TProperty defaultValue) {
    return properties.containsKey(key)
      ? (TProperty) properties.get(key)
      : defaultValue;
  }

  /**
   * Sets a property by its key and value.
   *
   * @param <TProperty> The type of the property value.
   * @param key The key of the property.
   * @param value The value of the property.
   * @return The current instance of IterationEventArgs.
   */
  public <TProperty> IterationEventArgs<TRecord, TEnvelope> setProperty(
    String key,
    TProperty value
  ) {
    properties.put(key, value);
    return this;
  }

  /**
   * Creates a new builder for IterationEventArgs.
   *
   * @param <TRecord> The type of the record being processed.
   * @param <TEnvelope> The type of the envelope containing the records.
   * @return A new builder instance.
   */
  public static <
    TRecord, TEnvelope extends IRecordExtractionEnvelope<TRecord>
  > Builder<TRecord, TEnvelope> builder() {
    return new Builder<TRecord, TEnvelope>();
  }

  /**
   * A builder for creating instances of IterationEventArgs.
   *
   * @param <TRecord> The type of the record being processed.
   * @param <TEnvelope> The type of the envelope containing the records.
   */
  public static class Builder<
    TRecord, TEnvelope extends IRecordExtractionEnvelope<TRecord>
  > {

    private Result<TEnvelope> iterationResult;
    private Result<List<TRecord>> aggregateResult;
    private int iteration;
    private Object service;

    /**
     * Sets the result of the current iteration.
     *
     * @param iterationResult The result of the current iteration.
     * @return The current builder instance.
     */
    public Builder<TRecord, TEnvelope> setIterationResult(
      Result<TEnvelope> iterationResult
    ) {
      this.iterationResult = iterationResult;
      return this;
    }

    /**
     * Sets the aggregated result of all iterations so far.
     *
     * @param aggregateResult The aggregated result of all iterations so far.
     * @return The current builder instance.
     */
    public Builder<TRecord, TEnvelope> setAggregateResult(
      Result<List<TRecord>> aggregateResult
    ) {
      this.aggregateResult = aggregateResult;
      return this;
    }

    /**
     * Sets the current iteration number.
     *
     * @param iteration The current iteration number.
     * @return The current builder instance.
     */
    public Builder<TRecord, TEnvelope> setIteration(int iteration) {
      this.iteration = iteration;
      return this;
    }

    /**
     * Sets the service associated with the iteration.
     *
     * @param service The service associated with the iteration.
     * @return The current builder instance.
     */
    public Builder<TRecord, TEnvelope> setService(Object service) {
      this.service = service;
      return this;
    }

    /**
     * Builds a new instance of IterationEventArgs.
     *
     * @return A new instance of IterationEventArgs.
     */
    public IterationEventArgs<TRecord, TEnvelope> build() {
      return new IterationEventArgs<TRecord, TEnvelope>(
        service,
        iterationResult,
        aggregateResult,
        iteration
      );
    }
  }
}
