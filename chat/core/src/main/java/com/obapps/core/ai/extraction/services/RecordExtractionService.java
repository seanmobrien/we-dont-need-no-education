package com.obapps.core.ai.extraction.services;

import com.obapps.core.ai.extraction.models.*;
import com.obapps.core.ai.factory.models.AiServiceOptions;
import com.obapps.core.ai.factory.services.StandaloneModelClientFactory;
import com.obapps.core.ai.factory.types.ILanguageModelFactory;
import dev.langchain4j.model.output.TokenUsage;
import dev.langchain4j.service.Result;
import dev.langchain4j.service.tool.ToolExecution;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.function.BiConsumer;
import java.util.function.Function;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * The {@code RecordExtractionService} class provides functionality for extracting records
 * from a service using a series of callbacks. It supports iterative extraction with
 * progress tracking and allows customization of the extraction process through callback
 * functions and event handlers.
 *
 * <p>This class is generic and can be used with various types of records, services, and
 * result envelopes that implement the {@code IRecordExtractionEnvelope} interface.
 *
 * <p>Key features include:
 * <ul>
 *   <li>A factory method {@code of} for creating instances of {@code RecordExtractionService}.</li>
 *   <li>An {@code extractRecords} method for performing iterative record extraction with
 *       support for progress tracking and soft fail detection.</li>
 *   <li>Overloaded static {@code extractRecords} methods for extracting records using
 *       AI service options and callback functions.</li>
 * </ul>
 *
 * <p>Usage example:
 * <pre>{@code
 * var service = RecordExtractionService.of(recordExtractor);
 * var result = service.extractRecords(
 *     myService,
 *     firstCallback,
 *     continueCallback,
 *     (obj, args) -> {
 *         // Handle iteration processed event
 *     }
 * );
 * }</pre>
 *
 * <p>Usage example with AI service options:
 * <pre>{@code
 * var result = RecordExtractionService.extractRecords(
 *     AiServiceOptions.builder(TService.class).build(),
 *     service -> {
 *         // Define the first callback logic
 *         return service.fetchInitialResults();
 *     },
 *     context -> {
 *         // Define the continue callback logic
 *         return context.getService().fetchNextResults(context);
 *     },
 *     (obj, args) -> {
 *         // Handle iteration processed event
 *         System.out.println("Processed iteration: " + args.getIterationIndex());
 *     }
 * );
 * }</pre>
 *
 * @param <TRecord> The type of the records being extracted.
 */
public class RecordExtractionService<TRecord> {

  /**
   * Factory method to create an instance of {@link RecordExtractionService}.
   *
   * @param <TModel> The type of the model being extracted.
   * @param <TModelResult> The type of the result envelope that implements {@link IRecordExtractionEnvelope}.
   * @param <TModelService> The type of the service used for record extraction.
   * @param recordExtractor A function that takes an instance of {@code TModelService} and returns a {@link Result}
   *                        containing the {@code TModelResult}.
   * @return A new instance of {@link RecordExtractionService} for the specified model type.
   */
  public static <
    TModel,
    TModelResult extends IRecordExtractionEnvelope<TModel>,
    TModelService
  > RecordExtractionService<TModel> of(
    Function<TModelService, Result<TModelResult>> recordExtractor
  ) {
    return new RecordExtractionService<TModel>();
  }

  private HashMap<String, Object> eventArgProps = new HashMap<String, Object>();
  private final Logger log = LoggerFactory.getLogger(
    RecordExtractionService.class
  );

  /**
   * Extracts records from a given service using the provided callbacks.
   *
   * @param <TService> The type of the service from which records are extracted.
   * @param <TServiceResult> The type of the result returned by the service, which must implement {@code IRecordExtractionEnvelope<TRecord>}.
   * @param <TRecord> The type of the records being extracted.
   * @param service The service instance used for record extraction.
   * @param firstCallback A function that takes the service as input and returns a {@code Result<TServiceResult>} containing the initial extraction result.
   * @param continueCallback A function that takes a {@code RecordExtractionContext} as input and returns a {@code Result<TServiceResult>} for continued extraction.
   * @return A {@code Result<List<TRecord>>} containing the extracted records or an error if the extraction fails.
   */
  public <
    TService, TServiceResult extends IRecordExtractionEnvelope<TRecord>
  > Result<List<TRecord>> extractRecords(
    TService service,
    Function<TService, Result<TServiceResult>> firstCallback,
    Function<
      RecordExtractionContext<TRecord, TService, TServiceResult>,
      Result<TServiceResult>
    > continueCallback,
    BiConsumer<
      Object,
      IterationEventArgs<TRecord, TServiceResult>
    > onIterationProcessed
  ) {
    var result = firstCallback.apply(service);
    if (result == null) {
      throw new IllegalArgumentException("Result cannot be null");
    }
    var iteration = getIteration(result);
    var records = new ArrayList<TRecord>(iteration.getResults());
    var toolExecutions = new ArrayList<ToolExecution>();
    if (result.toolExecutions() != null) {
      toolExecutions.addAll(result.toolExecutions());
    }
    var aggregateResult = new Result<List<TRecord>>(
      records,
      result.tokenUsage(),
      result.sources(),
      result.finishReason(),
      toolExecutions
    );
    if (onIterationProcessed != null) {
      onIterationProcessed.accept(
        this,
        new IterationEventArgs<TRecord, TServiceResult>(
          service,
          result,
          aggregateResult,
          0,
          eventArgProps
        )
      );
    }

    int index = 1; // Initialize the index for tracking iterations
    int noProgressCount = 0; // Initialize a counter for number of iterations without progress to detect soft fails
    while (!iteration.getAllRecordsEmitted()) {
      // If model is not confident we're done that means it thinks we have more matches, right?
      if (iteration.getMoreResultsAvailable() == 0) {
        // Hmm...this seems no bueno.
        noProgressCount++;

        if (noProgressCount > 2) {
          log.error(
            "No progress detected since iteration {} (currently {}) - processing is halting.",
            index - noProgressCount,
            index
          );
          break; // Break the loop if there are 3 iterations without progress
        }
        log.warn(
          "No progress detected in iteration {} - this has happened {} times.",
          index,
          noProgressCount
        );
      } else {
        noProgressCount = 0; // Reset the counter if progress is made
      }
      result = continueCallback.apply(
        new RecordExtractionContext<TRecord, TService, TServiceResult>(
          service,
          aggregateResult,
          index + 1,
          eventArgProps
        )
      );
      iteration = getIteration(result);
      records.addAll(iteration.getResults());
      if (result.toolExecutions() != null) {
        toolExecutions.addAll(result.toolExecutions());
      }
      aggregateResult = new Result<List<TRecord>>(
        records,
        TokenUsage.sum(aggregateResult.tokenUsage(), result.tokenUsage()),
        result.sources(),
        result.finishReason(),
        toolExecutions
      );
      if (onIterationProcessed != null) {
        onIterationProcessed.accept(
          this,
          new IterationEventArgs<TRecord, TServiceResult>(
            service,
            result,
            aggregateResult,
            index
          )
        );
      }
      index++;
    }
    return aggregateResult;
  }

  /**
   * Retrieves the iteration from the given result by extracting its content and
   * safely casting it to an {@code IRecordExtractionEnvelope<TRecord>}.
   *
   * @param result The result object containing the content to be extracted.
   * @return The extracted content as an {@code IRecordExtractionEnvelope<TRecord>}.
   * @throws IllegalArgumentException If the content is null or not an instance of
   *                                  {@code IRecordExtractionEnvelope<?>}.
   */
  protected IRecordExtractionEnvelope<TRecord> getIteration(Result<?> result) {
    var content = result.content();
    if (content == null || !(content instanceof IRecordExtractionEnvelope<?>)) {
      throw new IllegalArgumentException("Content cannot be null");
    }
    // Safely cast the content to IRecordExtractionEnvelope<TModel>
    @SuppressWarnings("unchecked")
    var iteration = (IRecordExtractionEnvelope<TRecord>) content;
    return iteration;
  }

  /**
   * Extracts records using the provided AI service options and callback functions.
   *
   * @param <TService>        The type of the AI service being used.
   * @param <TRecord>         The type of the records being extracted.
   * @param <TServiceResult>  The type of the result returned by the AI service, which must implement {@code IRecordExtractionEnvelope<TRecord>}.
   * @param aiOptions         The options for configuring the AI service.
   * @param firstCallback     A function that takes an instance of {@code TService} and returns a {@code Result<TServiceResult>}
   *                          representing the initial extraction result.
   * @param continueCallback  A function that takes a {@code RecordExtractionContext<TRecord, TService, TServiceResult>}
   *                          and returns a {@code Result<TServiceResult>} for subsequent extractions.
   * @return                  A {@code Result<List<TRecord>>} containing the extracted records or an error if the extraction fails.
   */
  public static <
    TService, TRecord, TServiceResult extends IRecordExtractionEnvelope<TRecord>
  > Result<List<TRecord>> extractRecords(
    AiServiceOptions<TService> aiOptions,
    Function<TService, Result<TServiceResult>> firstCallback,
    Function<
      RecordExtractionContext<TRecord, TService, TServiceResult>,
      Result<TServiceResult>
    > continueCallback
  ) {
    return extractRecords(
      null,
      aiOptions,
      firstCallback,
      continueCallback,
      null
    );
  }

  /**
   * Extracts records using the specified AI service options and callbacks.
   *
   * @param <TService> The type of the AI service being used.
   * @param <TRecord> The type of the records being extracted.
   * @param modelFactory      The factory for creating the AI service instance.
   * @param <TServiceResult> The type of the result envelope containing the extracted records.
   * @param aiOptions The options for configuring the AI service.
   * @param firstCallback A function that takes the AI service and returns the initial result envelope.
   * @param continueCallback A function that processes the context and returns the next result envelope.
   * @param onIterationProcessed A callback that is invoked after each iteration with the current object and iteration event arguments.
   * @return A {@code Result} containing a list of extracted records.
   */
  public static <
    TService, TRecord, TServiceResult extends IRecordExtractionEnvelope<TRecord>
  > Result<List<TRecord>> extractRecords(
    AiServiceOptions<TService> aiOptions,
    Function<TService, Result<TServiceResult>> firstCallback,
    Function<
      RecordExtractionContext<TRecord, TService, TServiceResult>,
      Result<TServiceResult>
    > continueCallback,
    BiConsumer<
      Object,
      IterationEventArgs<TRecord, TServiceResult>
    > onIterationProcessed
  ) {
    return extractRecords(
      null,
      aiOptions,
      firstCallback,
      continueCallback,
      onIterationProcessed
    );
  }

  /**
   * Extracts records using the provided AI service options and callback functions.
   *
   * @param <TService>        The type of the AI service being used.
   * @param <TRecord>         The type of the records being extracted.
   * @param <TServiceResult>  The type of the result returned by the AI service, which must implement {@code IRecordExtractionEnvelope<TRecord>}.
   * @param modelFactory      The factory for creating the AI service instance.
   * @param aiOptions         The options for configuring the AI service.
   * @param firstCallback     A function that takes an instance of {@code TService} and returns a {@code Result<TServiceResult>}
   *                          representing the initial extraction result.
   * @param continueCallback  A function that takes a {@code RecordExtractionContext<TRecord, TService, TServiceResult>}
   *                          and returns a {@code Result<TServiceResult>} for subsequent extractions.
   * @return                  A {@code Result<List<TRecord>>} containing the extracted records or an error if the extraction fails.
   */
  public static <
    TService, TRecord, TServiceResult extends IRecordExtractionEnvelope<TRecord>
  > Result<List<TRecord>> extractRecords(
    ILanguageModelFactory modelFactory,
    AiServiceOptions<TService> aiOptions,
    Function<TService, Result<TServiceResult>> firstCallback,
    Function<
      RecordExtractionContext<TRecord, TService, TServiceResult>,
      Result<TServiceResult>
    > continueCallback
  ) {
    return extractRecords(
      modelFactory,
      aiOptions,
      firstCallback,
      continueCallback,
      null
    );
  }

  /**
   * Extracts records using the specified AI service options and callbacks.
   *
   * @param <TService> The type of the AI service being used.
   * @param <TRecord> The type of the records being extracted.
   * @param <TServiceResult> The type of the result envelope containing the extracted records.
   * @param aiOptions The options for configuring the AI service.
   * @param firstCallback A function that takes the AI service and returns the initial result envelope.
   * @param continueCallback A function that processes the context and returns the next result envelope.
   * @param onIterationProcessed A callback that is invoked after each iteration with the current object and iteration event arguments.
   * @return A {@code Result} containing a list of extracted records.
   */
  public static <
    TService, TRecord, TServiceResult extends IRecordExtractionEnvelope<TRecord>
  > Result<List<TRecord>> extractRecords(
    ILanguageModelFactory modelFactory,
    AiServiceOptions<TService> aiOptions,
    Function<TService, Result<TServiceResult>> firstCallback,
    Function<
      RecordExtractionContext<TRecord, TService, TServiceResult>,
      Result<TServiceResult>
    > continueCallback,
    BiConsumer<
      Object,
      IterationEventArgs<TRecord, TServiceResult>
    > onIterationProcessed
  ) {
    return RecordExtractionService.extractRecords(
      new HashMap<String, Object>(),
      modelFactory,
      aiOptions,
      firstCallback,
      continueCallback,
      onIterationProcessed
    );
  }

  /**
   * Extracts records using the specified AI service options and callbacks.
   *
   * @param <TService> The type of the AI service being used.
   * @param <TRecord> The type of the records being extracted.
   * @param <TServiceResult> The type of the result envelope containing the extracted records.
   * @param aiOptions The options for configuring the AI service.
   * @param firstCallback A function that takes the AI service and returns the initial result envelope.
   * @param continueCallback A function that processes the context and returns the next result envelope.
   * @param onIterationProcessed A callback that is invoked after each iteration with the current object and iteration event arguments.
   * @return A {@code Result} containing a list of extracted records.
   */
  public static <
    TService, TRecord, TServiceResult extends IRecordExtractionEnvelope<TRecord>
  > Result<List<TRecord>> extractRecords(
    HashMap<String, Object> properties,
    ILanguageModelFactory modelFactory,
    AiServiceOptions<TService> aiOptions,
    Function<TService, Result<TServiceResult>> firstCallback,
    Function<
      RecordExtractionContext<TRecord, TService, TServiceResult>,
      Result<TServiceResult>
    > continueCallback,
    BiConsumer<
      Object,
      IterationEventArgs<TRecord, TServiceResult>
    > onIterationProcessed
  ) {
    if (modelFactory == null) {
      modelFactory = new StandaloneModelClientFactory();
    }
    var me = new RecordExtractionService<TRecord>();
    me.eventArgProps = properties;
    var service = new StandaloneModelClientFactory().createService(aiOptions);
    var result = me.extractRecords(
      service,
      firstCallback,
      continueCallback,
      onIterationProcessed
    );
    return result;
  }
}
