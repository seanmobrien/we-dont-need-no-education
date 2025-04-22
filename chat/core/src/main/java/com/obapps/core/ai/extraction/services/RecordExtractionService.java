package com.obapps.core.ai.extraction.services;

import com.obapps.core.ai.extraction.models.*;
import dev.langchain4j.model.output.TokenUsage;
import dev.langchain4j.service.Result;
import dev.langchain4j.service.tool.ToolExecution;
import java.util.ArrayList;
import java.util.List;
import java.util.function.BiConsumer;
import java.util.function.Function;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class RecordExtractionService<TRecord> {

  private final Logger log = LoggerFactory.getLogger(
    RecordExtractionService.class
  );

  public <
    TService, TServiceResult extends IRecordExtractionEnvelope<TRecord>
  > Result<List<TRecord>> extractRecords(
    TService service,
    Function<TService, Result<TServiceResult>> firstCallback,
    Function<
      RecordExtractionContext<TRecord, TService, TServiceResult>,
      Result<TServiceResult>
    > continueCallback
  ) {
    return extractRecords(service, firstCallback, continueCallback, null);
  }

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
          0
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
          index + 1
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

  private IRecordExtractionEnvelope<TRecord> getIteration(Result<?> result) {
    var content = result.content();
    if (content == null || !(content instanceof IRecordExtractionEnvelope<?>)) {
      throw new IllegalArgumentException("Content cannot be null");
    }
    // Safely cast the content to IRecordExtractionEnvelope<TModel>
    @SuppressWarnings("unchecked")
    var iteration = (IRecordExtractionEnvelope<TRecord>) content;
    return iteration;
  }
}
