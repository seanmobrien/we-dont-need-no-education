package com.obapps.core.ai.extraction.models;

import dev.langchain4j.service.Result;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

/**
 * Represents the context for record extraction operations.
 *
 * @param <TRecord> The type of the record being processed.
 * @param <TService> The type of the service used for extraction.
 * @param <TServiceResult> The type of the service result, which extends IRecordExtractionEnvelope.
 */
public class RecordExtractionContext<
  TRecord, TService, TServiceResult extends IRecordExtractionEnvelope<TRecord>
> {

  /**
   * The service used for record extraction.
   */
  private final TService service;

  /**
   * The aggregated results of the record extraction process.
   */
  private final Result<List<TRecord>> aggregateResults;

  /**
   * The current iteration number in the extraction process.
   */
  private final Integer iteration;

  /**
   * Additional properties associated with the extraction context.
   */
  private final Map<String, Object> eventArgProps;

  /**
   * Constructs a RecordExtractionContext instance with the specified parameters.
   *
   * @param service The service used for record extraction.
   * @param aggregateResults The aggregated results of the record extraction process.
   * @param iteration The current iteration number in the extraction process.
   * @param eventArgProps Additional properties associated with the extraction context.
   */
  public RecordExtractionContext(
    TService service,
    Result<List<TRecord>> aggregateResults,
    Integer iteration,
    Map<String, Object> eventArgProps
  ) {
    super();
    this.service = service;
    this.iteration = iteration;
    this.aggregateResults = aggregateResults;
    this.eventArgProps = eventArgProps == null ? Map.of() : eventArgProps;
  }

  /**
   * Gets the service used for record extraction.
   *
   * @return The service used for record extraction.
   */
  public TService getService() {
    return service;
  }

  /**
   * Creates a function to forward the context to a callback function.
   *
   * @param callback The callback function to process the service.
   * @return A function that forwards the context to the callback function.
   */
  public Function<
    RecordExtractionContext<TRecord, TService, TServiceResult>,
    Result<TServiceResult>
  > forward(Function<TService, Result<TServiceResult>> callback) {
    return context -> callback.apply(context.service);
  }

  /**
   * Gets the aggregated results of the record extraction process.
   *
   * @return The aggregated results of the record extraction process.
   */
  public Result<List<TRecord>> getAggregateResults() {
    return aggregateResults;
  }

  /**
   * Gets the current iteration number in the extraction process.
   *
   * @return The current iteration number in the extraction process.
   */
  public Integer getIteration() {
    return iteration;
  }

  /**
   * Gets the number of matches found in the aggregated results.
   *
   * @return The number of matches found in the aggregated results.
   */
  public Integer getMatchesFound() {
    var list = aggregateResults.content();
    return list == null ? 0 : list.size();
  }

  /**
   * Gets a property by its key.
   *
   * @param <TObj> The type of the property value.
   * @param key The key of the property.
   * @return The value of the property, or null if not found.
   */
  @SuppressWarnings("unchecked")
  public <TObj> TObj getProperty(String key) {
    return (TObj) eventArgProps.get(key);
  }

  /**
   * Sets a property by its key and value.
   *
   * @param key The key of the property.
   * @param value The value of the property.
   */
  public void setProperty(String key, Object value) {
    eventArgProps.put(key, value);
  }
}
