package com.obapps.schoolchatbot.core.models;

import dev.langchain4j.service.Result;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.stream.Collectors;

/**
 * Represents the result of analyzing a document.
 */
public class AnalystDocumentResult {

  /** Indicates whether the analysis was successful. */
  private final Boolean success;

  /** Indicates whether the analysis is complete. */
  private final Boolean complete;

  /** A message providing details about the analysis. */
  private final String message;

  /** The number of new records created during the analysis. */
  private final Integer newRecords;

  /** The number of new notes created during the analysis. */
  private final Integer newNotes;

  /** The number of input tokens used during the analysis. */
  private final Integer inputTokens;

  /** The number of output tokens generated during the analysis. */
  private final Integer outputTokens;

  /** A string representation of function calls made during the analysis. */
  private final String functionCalls;

  /**
   * Constructs an AnalystDocumentResult from an exception.
   *
   * @param ex the exception that occurred
   * @param newRecords the number of new records created
   * @param newNotes the number of new notes created
   */
  public AnalystDocumentResult(
    Exception ex,
    Integer newRecords,
    Integer newNotes
  ) {
    this(
      false,
      false,
      ex.getMessage() +
      "\r\nStack Trace:\r\n\t" +
      String.join(
        "\r\n\t",
        Arrays.stream(ex.getStackTrace())
          .map(StackTraceElement::toString)
          .toArray(String[]::new)
      ),
      newNotes,
      newRecords,
      0,
      0,
      ""
    );
  }

  /**
   * Constructs an AnalystDocumentResult from a result object.
   *
   * @param result the result object containing analysis details
   * @param success whether the analysis was successful
   * @param newNotes the number of new notes created
   * @param newRecords the number of new records created
   * @param completed whether the analysis is complete
   */
  public AnalystDocumentResult(
    Result<?> result,
    boolean success,
    Integer newNotes,
    Integer newRecords,
    boolean completed
  ) {
    this(
      success,
      completed,
      result.content().toString(),
      newNotes,
      newRecords,
      result.tokenUsage().inputTokenCount(),
      result.tokenUsage().outputTokenCount(),
      String.join(
        "\n",
        result
          .toolExecutions()
          .stream()
          .map(t ->
            String.format(
              "%s (%s)",
              t.request().name(),
              t.request().arguments()
            )
          )
          .collect(Collectors.toList())
      )
    );
  }

  /**
   * Constructs an AnalystDocumentResult with detailed parameters.
   *
   * @param success whether the analysis was successful
   * @param complete whether the analysis is complete
   * @param message a message providing details about the analysis
   * @param newNotes the number of new notes created
   * @param newRecords the number of new records created
   * @param inputTokens the number of input tokens used
   * @param outputTokens the number of output tokens generated
   * @param functionCalls a string representation of function calls made
   */
  public AnalystDocumentResult(
    Boolean success,
    Boolean complete,
    String message,
    Integer newNotes,
    Integer newRecords,
    Integer inputTokens,
    Integer outputTokens,
    String functionCalls
  ) {
    this.success = success;
    this.complete = complete;
    this.message = message;
    this.inputTokens = inputTokens;
    this.outputTokens = outputTokens;
    this.functionCalls = functionCalls;
    this.newNotes = newNotes;
    this.newRecords = newRecords;
  }

  /**
   * @return whether the analysis is complete
   */
  public Boolean getComplete() {
    return complete;
  }

  /**
   * @return whether the analysis was successful
   */
  public Boolean getSuccess() {
    return success;
  }

  /**
   * @return the message providing details about the analysis
   */
  public String getMessage() {
    return message;
  }

  /**
   * @return the number of new records created during the analysis
   */
  public Integer getNewRecords() {
    return newRecords;
  }

  /**
   * @return the number of new notes created during the analysis
   */
  public Integer getNewNotes() {
    return newNotes;
  }

  /**
   * @return the number of input tokens used during the analysis
   */
  public Integer getInputTokens() {
    return inputTokens;
  }

  /**
   * @return the number of output tokens generated during the analysis
   */
  public Integer getOutputTokens() {
    return outputTokens;
  }

  /**
   * @return a string representation of function calls made during the analysis
   */
  public String getFunctionCalls() {
    return functionCalls;
  }

  /**
   * @return a summary of the analysis result
   */
  public String getSummary() {
    return String.format(
      "%s\n\tSuccess: %s\n\tInput Tokens: %s\n\tOutput Tokens: %s\n\tNew Records: %s\n\tNew Notes: %s\\n" + //
      "\tComplete: %s",
      message,
      success,
      inputTokens,
      outputTokens,
      newRecords,
      newNotes,
      complete
    );
  }

  /**
   * @return a string representation of the analysis result
   */
  public String toString() {
    return String.format(
      "%s\n\tSuccess: %s\n\tInput Tokens: %s\n\tOutput Tokens: %s\n\tNew Records: %s\n\tNew Notes: %s\\n" + //
      "\tComplete: %s\n\tFunction Calls: %s",
      message,
      success,
      inputTokens,
      outputTokens,
      newRecords,
      newNotes,
      complete,
      functionCalls
    );
  }

  /**
   * @return a new AggregateBuilder instance
   */
  public static AggregateBuilder aggregateBuilder() {
    return new AggregateBuilder();
  }

  /**
   * A builder class for aggregating multiple AnalystDocumentResult instances.
   */
  public static class AggregateBuilder {

    /** Indicates whether the aggregated results are successful. */
    private Boolean success;

    /** Indicates whether the aggregated results are complete. */
    private Boolean completed;

    /** A list of AnalystDocumentResult instances to aggregate. */
    private ArrayList<AnalystDocumentResult> frames;

    /**
     * Constructs an AggregateBuilder instance.
     */
    public AggregateBuilder() {
      super();
      this.success = false;
      this.completed = false;
      this.frames = new ArrayList<>();
    }

    /**
     * Appends an AnalystDocumentResult to the aggregation.
     *
     * @param result the result to append
     * @return the updated AggregateBuilder instance
     */
    public AggregateBuilder append(AnalystDocumentResult result) {
      if (result != null) {
        if (this.frames.isEmpty()) {
          this.success = result.success;
        } else if (!result.success) {
          this.success = false;
        }
        if (result.complete) {
          this.completed = true;
        }
        this.frames.add(result);
      }
      return this;
    }

    /**
     * Builds an aggregated AnalystDocumentResult.
     *
     * @return the aggregated AnalystDocumentResult
     * @throws IllegalStateException if no frames are available to build from
     */
    public AnalystDocumentResult build() {
      // If we are empty throw
      if (this.frames.isEmpty()) {
        throw new IllegalStateException("No frames to build from.");
      }
      // If we only have one frame, return it
      if (this.frames.size() == 1) {
        return this.frames.get(0);
      }
      // Otherwise lets aggregate these bitches
      var aggMessage = new StringBuilder();
      var aggFunctions = new StringBuilder();
      var aggNewRecords = 0;
      var aggNewNotes = 0;
      var aggInputTokens = 0;
      var aggOutputTokens = 0;
      for (var idx = 0; idx < this.frames.size(); idx++) {
        var frame = this.frames.get(idx);
        var delimiter = String.format(
          "%s------------=== Iteration %s ===------------\n",
          idx == 0 ? "" : "\n",
          idx + 1
        );
        aggMessage.append(delimiter).append(frame.getMessage()).append("\n");
        aggFunctions
          .append(delimiter)
          .append(
            frame.getFunctionCalls().length() > 0
              ? frame.getFunctionCalls()
              : "No function calls made"
          )
          .append("\n");
        aggNewRecords += frame.getNewRecords() != null
          ? frame.getNewRecords()
          : 0;
        aggNewNotes += frame.getNewNotes() != null ? frame.getNewNotes() : 0;
        aggInputTokens += frame.getInputTokens() != null
          ? frame.getInputTokens()
          : 0;
        aggOutputTokens += frame.getOutputTokens() != null
          ? frame.getOutputTokens()
          : 0;
      }
      return new AnalystDocumentResult(
        this.success,
        this.completed,
        aggMessage.toString(),
        aggNewNotes,
        aggNewRecords,
        aggInputTokens,
        aggOutputTokens,
        aggFunctions.toString()
      );
    }
  }
}
