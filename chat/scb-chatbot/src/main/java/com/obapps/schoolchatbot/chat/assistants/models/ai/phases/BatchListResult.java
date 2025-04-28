package com.obapps.schoolchatbot.chat.assistants.models.ai.phases;

import java.util.List;

public class BatchListResult<TModel> extends BatchResult<List<TModel>> {

  private final List<TModel> results;

  public BatchListResult(
    List<TModel> results,
    boolean success,
    String errorMessage
  ) {
    super(results, success, errorMessage);
    this.results = results;
  }

  public List<TModel> getResults() {
    return results;
  }

  public static <TModel> BatchListResult<TModel> success(List<TModel> results) {
    return new BatchListResult<>(results, true, null);
  }

  public static <TModel> BatchListResult<TModel> failureForList(
    String errorMessage
  ) {
    return new BatchListResult<>(null, false, errorMessage);
  }

  public static <TModel> BatchListResult<TModel> partialSuccess(
    List<TModel> results,
    String warningMessage
  ) {
    return new BatchListResult<>(results, true, warningMessage);
  }

  public static <TModel> BatchListResult<TModel> empty() {
    return new BatchListResult<>(List.of(), true, null);
  }

  public static <TModel> BatchListResult<TModel> emptyWithError(
    String errorMessage
  ) {
    return new BatchListResult<>(List.of(), false, errorMessage);
  }
}
