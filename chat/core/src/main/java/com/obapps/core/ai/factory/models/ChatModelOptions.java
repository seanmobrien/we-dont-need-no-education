package com.obapps.core.ai.factory.models;

import dev.langchain4j.model.azure.AzureOpenAiChatModel;
import java.util.function.Function;

public class ChatModelOptions extends ChatModelOptionsBase {

  public static Builder builder() {
    return new Builder();
  }

  public static Builder builder(ChatModelOptionsBase options) {
    return new Builder().copy(options);
  }

  public static class Builder {

    private ModelType modelType = ModelType.LoFi;
    private Double temperature = null;
    private boolean mcpEnabled = true;
    private Function<
      AzureOpenAiChatModel.Builder,
      AzureOpenAiChatModel.Builder
    > setupCallback = null;

    protected Builder() {}

    public Builder modelType(ModelType modelType) {
      this.modelType = modelType;
      return this;
    }

    public Builder temperature(Double temperature) {
      this.temperature = temperature;
      return this;
    }

    public Builder mcpEnabled(boolean mcpEnabled) {
      this.mcpEnabled = mcpEnabled;
      return this;
    }

    public Builder copy(ChatModelOptionsBase options) {
      this.modelType = options.modelType;
      this.temperature = options.temperature;
      this.mcpEnabled = options.mcpEnabled;
      return this;
    }

    /**
     * Sets a callback to be invoked during the setup of the service options.
     *
     * @param setupCallback The setup callback.
     * @param <T>           The type of the builder.
     * @return The builder instance.
     */
    public Builder onSetupModelCallback(
      Function<
        AzureOpenAiChatModel.Builder,
        AzureOpenAiChatModel.Builder
      > setupCallback
    ) {
      this.setupCallback = setupCallback;
      return this;
    }

    /**
     * Builds and returns an instance of the specified class type with the configured options.
     *
     * @return An instance of the specified class type with the configured options.
     */
    public ChatModelOptions build() {
      ChatModelOptions ret = new ChatModelOptions();
      ret.modelType = this.modelType;
      ret.temperature = this.temperature;
      ret.mcpEnabled = this.mcpEnabled;
      ret.onSetupModelCallback = this.setupCallback;
      return ret;
    }
  }
}
