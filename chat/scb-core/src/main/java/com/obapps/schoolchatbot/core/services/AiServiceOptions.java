package com.obapps.schoolchatbot.core.services;

public class AiServiceOptions {

  public boolean structuredOutput;
  public ModelType modelType = ModelType.LoFi;
  public Integer memoryWindow = 0;

  public AiServiceOptions() {
    this(false);
  }

  public AiServiceOptions(boolean structuredOutput) {
    this.structuredOutput = structuredOutput;
  }

  public AiServiceOptions(
    boolean structuredOutput,
    ModelType modelType,
    Integer memoryWindow
  ) {
    this.structuredOutput = structuredOutput;
    this.modelType = modelType;
    this.memoryWindow = memoryWindow;
  }

  public static Builder builder() {
    return new Builder();
  }

  public static class Builder {

    protected Builder() {
      // Default constructor
    }

    private ModelType modelType = ModelType.LoFi;
    private boolean structuredOutput = false;
    private Integer memoryWindow = 0;

    public Builder setStructuredOutput(boolean structuredOutput) {
      this.structuredOutput = structuredOutput;
      return this;
    }

    public Builder setModelType(ModelType modelType) {
      this.modelType = modelType;
      return this;
    }

    public Builder setMemoryWindow(Integer memoryWindow) {
      if (memoryWindow != null) {
        this.memoryWindow = memoryWindow;
      }
      return this;
    }

    public AiServiceOptions build() {
      return new AiServiceOptions(structuredOutput, modelType, memoryWindow);
    }
  }
}
