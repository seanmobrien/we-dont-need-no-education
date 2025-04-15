package com.obapps.schoolchatbot.core.models;

public class AnalystDocumentResult {

  private final Boolean success;
  private final String message;
  private final Integer newRecords;
  private final Integer newNotes;
  private final Integer inputTokens;
  private final Integer outputTokens;
  private final Integer functionCalls;
  private final Integer iteration;

  private AnalystDocumentResult(Builder builder) {
    this.success = builder.success;
    this.message = builder.message;
    this.newRecords = builder.newRecords;
    this.newNotes = builder.newNotes;
    this.inputTokens = builder.inputTokens;
    this.outputTokens = builder.outputTokens;
    this.functionCalls = builder.functionCalls;
    this.iteration = builder.iteration;
  }

  public Boolean getSuccess() {
    return success;
  }

  public String getMessage() {
    return message;
  }

  public Integer getIteration() {
    return iteration;
  }

  public Integer getNewRecords() {
    return newRecords;
  }

  public Integer getNewNotes() {
    return newNotes;
  }

  public Integer getInputTokens() {
    return inputTokens;
  }

  public Integer getOutputTokens() {
    return outputTokens;
  }

  public Integer getFunctionCalls() {
    return functionCalls;
  }

  public static class Builder {

    private Boolean success;
    private String message;
    private Integer newRecords = 0;
    private Integer newNotes = 0;
    private Integer inputTokens = 0;
    private Integer outputTokens = 0;
    private Integer functionCalls = 0;
    private Integer iteration = -1;

    public Builder append(AnalystDocumentResult result) {
      if (result != null) {
        if (!result.success) {
          this.success = false;
        }
        if (this.message == null) {
          this.message = result.message;
        } else {
          this.message += String.format(
            "\n---------------------------- Iteration %d ----------------------------------------\n%s",
            result.iteration,
            result.message
          );
        }
        this.newRecords += result.newRecords;
        this.newNotes += result.newNotes;
        this.inputTokens += result.inputTokens;
        this.outputTokens += result.outputTokens;
        this.functionCalls += result.functionCalls;
        this.iteration = result.iteration;
      }
      return this;
    }

    public Builder setIteration(Integer iteration) {
      this.iteration = iteration;
      return this;
    }

    public Builder setSuccess(Boolean success) {
      this.success = success;
      return this;
    }

    public Builder setMessage(String message) {
      this.message = message;
      return this;
    }

    public Builder setNewRecords(Integer newRecords) {
      this.newRecords = newRecords;
      return this;
    }

    public Builder setNewNotes(Integer newNotes) {
      this.newNotes = newNotes;
      return this;
    }

    public Builder setInputTokens(Integer inputTokens) {
      this.inputTokens = inputTokens;
      return this;
    }

    public Builder setOutputTokens(Integer outputTokens) {
      this.outputTokens = outputTokens;
      return this;
    }

    public Builder setFunctionCalls(Integer functionCalls) {
      this.functionCalls = functionCalls;
      return this;
    }

    public AnalystDocumentResult build() {
      return new AnalystDocumentResult(this);
    }
  }
}
