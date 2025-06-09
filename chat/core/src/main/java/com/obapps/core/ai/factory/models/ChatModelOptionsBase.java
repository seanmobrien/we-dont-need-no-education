package com.obapps.core.ai.factory.models;

import dev.langchain4j.model.azure.AzureOpenAiChatModel;
import java.util.function.Function;

public class ChatModelOptionsBase {

  /**
   * Specifies the model type to be used.
   */
  public ModelType modelType = ModelType.HiFi;

  /**
   * The temperature parameter controls the randomness of the model's output.
   * A higher value (e.g., 1.0) makes the output more random, while a lower value
   * (e.g., 0.1) makes it more focused and deterministic. If set to null, a default
   * value may be used by the system.
   */
  public Double temperature = null;

  /**
   * Indicates whether MCP (Model Context Protocol) support should be enabled.
   * Defaults to true. If enabled but MCP_SERVER_URL is not set, MCP will be
   * disabled and a warning will be logged.
   */
  public boolean mcpEnabled = true;

  /**
   * Supports extended model configuration via a callback.
   * This function allows customization of the AzureOpenAiChatModel.Builder
   * by applying additional configurations or modifications.
   */
  public Function<
    AzureOpenAiChatModel.Builder,
    AzureOpenAiChatModel.Builder
  > onSetupModelCallback;
}
