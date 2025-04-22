package com.obapps.core.ai.extraction.models;

import dev.langchain4j.service.Result;
import java.util.List;
import java.util.function.Function;

public class RecordExtractionContext<
  TRecord, TService, TServiceResult extends IRecordExtractionEnvelope<TRecord>
> {

  private final TService service;
  private final Result<List<TRecord>> aggregateResults;
  private final Integer iteration;

  public RecordExtractionContext(
    TService service,
    Result<List<TRecord>> aggregateResults,
    Integer iteration
  ) {
    super();
    this.service = service;
    this.iteration = iteration;
    this.aggregateResults = aggregateResults;
  }

  public TService getService() {
    return service;
  }

  public Function<
    RecordExtractionContext<TRecord, TService, TServiceResult>,
    Result<TServiceResult>
  > forward(Function<TService, Result<TServiceResult>> callback) {
    return context -> callback.apply(context.service);
  }

  public Result<List<TRecord>> getAggregateResults() {
    return aggregateResults;
  }

  public Integer getIteration() {
    return iteration;
  }

  public Integer getMatchesFound() {
    var list = aggregateResults.content();
    return list == null ? 0 : list.size();
  }
}
