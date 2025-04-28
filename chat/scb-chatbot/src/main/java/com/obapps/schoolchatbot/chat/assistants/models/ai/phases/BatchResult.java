package com.obapps.schoolchatbot.chat.assistants.models.ai.phases;

import java.util.ArrayList;
import java.util.List;

/**
 * Represents the result of a batch operation.
 * @param <TRetVal> The type of the result value.
 */
public class BatchResult<TRetVal> {

  /**
   * The results of the batch operation.
   */
  private final TRetVal results;

  /**
   * Indicates whether the batch operation was successful.
   */
  private final boolean success;

  /**
   * The error message, if the batch operation failed.
   */
  private final String errorMessage;

  /**
   * The exception cause, if the batch operation failed.
   */
  private final Exception cause;

  /**
   * A list of processing notes that provides additional information or context
   * about the batch processing results. This list is initialized as an empty
   * ArrayList and is immutable, ensuring that it cannot be reassigned after
   * initialization.
   */
  private final List<String> processingNotes = new ArrayList<String>();

  /**
   * Constructs a BatchResult with the specified results, success status, and error message.
   * @param results The results of the batch operation.
   * @param success Whether the operation was successful.
   * @param errorMessage The error message, if any.
   */
  public BatchResult(TRetVal results, boolean success, String errorMessage) {
    this(results, success, errorMessage, null);
  }

  /**
   * Constructs a BatchResult with the specified results, success status, error message, and cause.
   * @param results The results of the batch operation.
   * @param success Whether the operation was successful.
   * @param errorMessage The error message, if any.
   * @param cause The exception cause, if any.
   */
  public BatchResult(
    TRetVal results,
    boolean success,
    String errorMessage,
    Exception cause
  ) {
    this.results = results;
    this.success = success;
    this.errorMessage = errorMessage;
    this.cause = cause;
  }

  /**
   * Gets the results of the batch operation.
   * @return The results.
   */
  public TRetVal getResults() {
    return results;
  }

  /**
   * Retrieves the cause of the exception that occurred during the batch process.
   *
   * @return the {@link Exception} that caused the issue, or {@code null} if no cause is available.
   */
  public Exception getCause() {
    return cause;
  }

  /**
   * Checks if the batch operation was successful.
   * @return True if successful, false otherwise.
   */
  public boolean isSuccess() {
    return success;
  }

  /**
   * Gets the error message of the batch operation.
   * @return The error message, or null if none.
   */
  public String getErrorMessage() {
    return errorMessage;
  }

  /**
   * Retrieves an unmodifiable copy of the processing notes.
   *
   * @return a list containing the processing notes, which cannot be modified.
   */
  public List<String> getProcessingNotes() {
    return List.copyOf(processingNotes);
  }

  /**
   * Creates a successful BatchResult with the specified results.
   * @param results The results of the batch operation.
   * @param <TRetVal> The type of the result value.
   * @return A successful BatchResult.
   */
  public static <TRetVal> BatchResult<TRetVal> success(
    TRetVal results,
    List<String> processingNotes
  ) {
    return builder(results)
      .success(true)
      .processingNotes(processingNotes)
      .errorMessage("Batch operation completed successfully.")
      .build();
  }

  /**
   * Creates a failed BatchResult with the specified error message.
   * @param errorMessage The error message.
   * @param <TRetVal> The type of the result value.
   * @return A failed BatchResult.
   */
  public static <TRetVal> BatchResult<TRetVal> failure(
    String errorMessage,
    List<String> processingNotes
  ) {
    return failure(errorMessage, null, processingNotes);
  }

  /**
   * Creates a failed BatchResult with the specified exception.
   * @param ex The exception.
   * @param <TRetVal> The type of the result value.
   * @return A failed BatchResult.
   */
  public static <TRetVal> BatchResult<TRetVal> failure(
    Exception ex,
    List<String> processingNotes
  ) {
    return builder((TRetVal) null)
      .cause(ex)
      .errorMessage(ex.getMessage())
      .processingNotes(processingNotes)
      .build();
  }

  /**
   * Creates a failed BatchResult with the specified error message and cause.
   * @param errorMessage The error message.
   * @param cause The exception cause.
   * @param <TRetVal> The type of the result value.
   * @return A failed BatchResult.
   */
  public static <TRetVal> BatchResult<TRetVal> failure(
    String errorMessage,
    Exception cause,
    List<String> processingNotes
  ) {
    return builder((TRetVal) null)
      .cause(cause)
      .errorMessage(errorMessage)
      .processingNotes(processingNotes)
      .build();
  }

  /**
   * Creates a builder for a BatchResult with the specified results.
   * @param results The results of the batch operation.
   * @param <TRetVal> The type of the result value.
   * @return A builder for a BatchResult.
   */
  public static <TRetVal> Builder<TRetVal> builder(TRetVal results) {
    return new Builder<TRetVal>().results(results);
  }

  /**
   * Creates a builder for a BatchResult with no initial results.
   * @return A builder for a BatchResult.
   */
  public static Builder<?> builder() {
    return new Builder<>().results(null);
  }

  /**
   * Builder class for constructing BatchResult instances.
   * @param <TRetVal> The type of the result value.
   */
  public static class Builder<TRetVal> {

    /**
     * The results of the batch operation.
     */
    private TRetVal results;

    /**
     * Indicates whether the batch operation was successful.
     */
    private boolean success;

    /**
     * The error message, if the batch operation failed.
     */
    private String errorMessage;

    /**
     * The exception cause, if the batch operation failed.
     */
    private Exception cause;

    /**
     * Processing notes during the batch operation.
     */
    private List<String> processingNotes = new ArrayList<String>();

    /**
     * Sets the results of the batch operation.
     * @param results The results to set.
     * @return The Builder instance.
     */
    public Builder<TRetVal> results(TRetVal results) {
      this.results = results;
      return this;
    }

    /**
     * Sets the success status of the batch operation.
     * @param success The success status to set.
     * @return The Builder instance.
     */
    public Builder<TRetVal> success(boolean success) {
      this.success = success;
      return this;
    }

    /**
     * Sets the processing notes for the builder. If the provided list of processing notes
     * is not null, all elements from the list will be added to the existing processing notes.
     *
     * @param processingNotes A list of processing notes to be added. If null, no action is taken.
     * @return The current instance of the builder for method chaining.
     */
    public Builder<TRetVal> processingNotes(List<String> processingNotes) {
      if (processingNotes != null) {
        this.processingNotes.addAll(processingNotes);
      }
      return this;
    }

    /**
     * Sets the error message of the batch operation.
     * @param errorMessage The error message to set.
     * @return The Builder instance.
     */
    public Builder<TRetVal> errorMessage(String errorMessage) {
      this.errorMessage = errorMessage;
      return this;
    }

    /**
     * Sets the exception cause of the batch operation.
     * @param cause The exception cause to set.
     * @return The Builder instance.
     */
    public Builder<TRetVal> cause(Exception cause) {
      this.cause = cause;
      return this;
    }

    /**
     * Builds a new BatchResult instance.
     * @return A new BatchResult instance.
     */
    public BatchResult<TRetVal> build() {
      var ret = new BatchResult<>(results, success, errorMessage, cause);
      ret.processingNotes.addAll(processingNotes);
      return ret;
    }

    /**
     * Builds a new BatchResult instance with default success status.
     * @return A new BatchResult instance with success status.
     */
    public BatchResult<TRetVal> buildWithDefaultSuccess() {
      var ret = new BatchResult<>(results, true, null);
      ret.processingNotes.addAll(processingNotes);
      return ret;
    }

    /**
     * Builds a new BatchResult instance with default failure status.
     * @return A new BatchResult instance with failure status.
     */
    public BatchResult<TRetVal> buildWithDefaultFailure() {
      var ret = new BatchResult<>((TRetVal) null, false, errorMessage, cause);
      ret.processingNotes.addAll(processingNotes);
      return ret;
    }

    /**
     * Builds a new BatchResult instance with default success status and a message.
     * @param message The success message.
     * @return A new BatchResult instance with success status and message.
     */
    public BatchResult<TRetVal> buildWithDefaultSuccessAndMessage(
      String message
    ) {
      var ret = new BatchResult<>(results, true, message);
      ret.processingNotes.addAll(processingNotes);
      return ret;
    }
  }
}
