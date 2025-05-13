package com.obapps.schoolchatbot.chat.assistants.services.ai.phases.two;

import com.obapps.schoolchatbot.chat.assistants.models.ai.phases.BatchResult;
import dev.langchain4j.service.Result;
import java.util.List;

/**
 * Interface for processing queue batches with models and batch results.
 *
 * @param <TModel> The type of the model being processed.
 * @param <TBatchResult> The type of the batch result produced.
 */
public interface IQueueProcessor<TModel, TBatchResult> {
  /**
   * Retrieves the name of the queue being processed.
   *
   * @return The name of the queue.
   */
  public String getQueueName();

  /**
   * Checks if the queue processor is ready to process batches.
   * @return True if the processor is ready, otherwise false.
   */
  Boolean getIsReady();

  /**
   * Called to signal the beginning of the processing phase.
   * Implementations should use this method to perform any setup
   * or initialization required before processing starts.
   */
  void onBeginProcessing();

  /**
   * Processes a batch of models in the given context.
   *
   * @param context The context containing the batch of models to process.
   * @return True if the batch was successfully processed, otherwise false.
   */
  public Boolean processBatch(QueueBatchContext<TModel> context);

  /**
   * Processes a batch of models and returns the result.
   *
   * @param context The context containing the batch of models to process.
   * @return A BatchResult containing the processing results.
   */
  public BatchResult<Result<List<TBatchResult>>> processBatchWithResult(
    QueueBatchContext<TModel> context
  );

  /**
   * The {@code QueueBatchContext} interface represents a batch processing context
   * for a queue of models. It extends the {@link List} interface to provide
   * additional functionality for managing the processing state of models in the batch.
   *
   * @param <TModel> The type of the models contained in the batch.
   */
  public static interface QueueBatchContext<TModel> extends List<TModel> {
    /**
     * Creates a batch context for processing a subset of items from a queue.
     *
     * @param batchStart The starting index of the batch within the queue.
     * @param batchSize The number of items to include in the batch.
     * @return A {@link QueueBatchContext} containing the specified batch of items.
     */
    public IQueueProcessor.QueueBatchContext<TModel> makeBatch(
      Integer batchStart,
      Integer batchSize
    );

    /**
     * Marks the given model as complete, indicating that processing for the model
     * has been finalized.  Calling this method will remove the model from the underlying
     * queue and mark it as completed.
     *
     * @param model The instance of TModel to be marked as complete.
     */
    public void setComplete(TModel model);

    /**
     * Aborts the processing of the batch.
     */
    public void setAbort();

    /**
     * Checks if the batch processing has been aborted.
     *
     * @return True if the batch processing is aborted, otherwise false.
     */
    public Boolean isAborted();

    /**
     * Checks if any model in the batch has been marked as completed.
     *
     * @return True if any model is completed, otherwise false.
     */
    public Boolean anyCompleted();

    /**
     * Replaces an existing model in the queue with a new instance.
     *
     * @param oldModel The model to be replaced.
     * @param newModel The model to replace the old model with.
     * @return {@code true} if the replacement was successful, {@code false} otherwise.
     */
    public Boolean replace(TModel oldModel, TModel newModel);

    /**
     * Replaces a list of old queued models with a list of new models.
     *
     * @param oldModels The list of models to be replaced.
     * @param newModels The list of models to replace the old models with.
     * @return A Boolean indicating whether the replacement was successful.
     */
    public Boolean replace(List<TModel> oldModels, List<TModel> newModels);

    /**
     * Replaces the current list of models with a new list of models.
     *
     * @param newModels the list of new models to replace the existing ones.
     * @return {@code true} if the replacement was successful, {@code false} otherwise.
     */
    public Boolean replace(List<TModel> newModels);
  }
}
