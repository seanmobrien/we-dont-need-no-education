package com.obapps.core.ai.extraction.services;

import com.obapps.core.ai.extraction.models.IRecordExtractionEnvelope;
import dev.langchain4j.service.Result;
import java.util.List;

public class IterationEventArgs<
  TRecord, TEnvelope extends IRecordExtractionEnvelope<TRecord>
> {

  private final Result<TEnvelope> iterationResult;
  private final Result<List<TRecord>> aggregateResult;
  private final int iteration;
  private final Object service;

  public IterationEventArgs(
    Object service,
    Result<TEnvelope> iterationResult,
    Result<List<TRecord>> aggregateResult,
    int iteration
  ) {
    this.service = service;
    this.iterationResult = iterationResult;
    this.aggregateResult = aggregateResult;
    this.iteration = iteration;
  }

  public Result<
    ? extends IRecordExtractionEnvelope<TRecord>
  > getIterationResult() {
    return iterationResult;
  }

  public Result<List<TRecord>> getAggregateResult() {
    return aggregateResult;
  }

  public int getIteration() {
    return iteration;
  }

  public int getNewRecords() {
    return iterationResult.content().getResults().size();
  }

  public boolean getHasSignaledComplete() {
    return iterationResult.content().getAllRecordsEmitted();
  }

  public int getEstimatedItemsRemaining() {
    return iterationResult.content().getMoreResultsAvailable();
  }

  public Object getService() {
    return service;
  }

  public static <
    TRecord, TEnvelope extends IRecordExtractionEnvelope<TRecord>
  > Builder<TRecord, TEnvelope> builder() {
    return new Builder<TRecord, TEnvelope>();
  }

  public static class Builder<
    TRecord, TEnvelope extends IRecordExtractionEnvelope<TRecord>
  > {

    private Result<TEnvelope> iterationResult;
    private Result<List<TRecord>> aggregateResult;
    private int iteration;
    private Object service;

    public Builder<TRecord, TEnvelope> setIterationResult(
      Result<TEnvelope> iterationResult
    ) {
      this.iterationResult = iterationResult;
      return this;
    }

    public Builder<TRecord, TEnvelope> setAggregateResult(
      Result<List<TRecord>> aggregateResult
    ) {
      this.aggregateResult = aggregateResult;
      return this;
    }

    public Builder<TRecord, TEnvelope> setIteration(int iteration) {
      this.iteration = iteration;
      return this;
    }

    public Builder<TRecord, TEnvelope> setService(Object service) {
      this.service = service;
      return this;
    }

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
