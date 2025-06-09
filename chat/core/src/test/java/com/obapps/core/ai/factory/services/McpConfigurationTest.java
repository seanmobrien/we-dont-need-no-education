package com.obapps.core.ai.factory.services;

import static org.assertj.core.api.Assertions.assertThat;

import com.obapps.core.ai.factory.models.AiServiceOptions;
import com.obapps.core.ai.factory.models.ChatModelOptions;
import org.junit.jupiter.api.Test;

public class McpConfigurationTest {

  @Test
  public void testChatModelOptionsDefaultMcpEnabled() {
    ChatModelOptions options = ChatModelOptions.builder().build();
    assertThat(options.mcpEnabled).isTrue();
  }

  @Test
  public void testChatModelOptionsMcpCanBeDisabled() {
    ChatModelOptions options = ChatModelOptions.builder()
        .mcpEnabled(false)
        .build();
    assertThat(options.mcpEnabled).isFalse();
  }

  @Test
  public void testAiServiceOptionsDefaultMcpEnabled() {
    AiServiceOptions<TestService> options = AiServiceOptions.builder(TestService.class).build();
    assertThat(options.mcpEnabled).isTrue();
  }

  @Test
  public void testAiServiceOptionsMcpCanBeDisabled() {
    AiServiceOptions<TestService> options = AiServiceOptions.builder(TestService.class)
        .setMcpEnabled(false)
        .build();
    assertThat(options.mcpEnabled).isFalse();
  }

  @Test
  public void testCopyPreservesMcpSetting() {
    ChatModelOptions sourceOptions = ChatModelOptions.builder()
        .mcpEnabled(false)
        .build();
    
    AiServiceOptions<TestService> copiedOptions = AiServiceOptions.builder(TestService.class)
        .copy(sourceOptions)
        .build();
    
    assertThat(copiedOptions.mcpEnabled).isFalse();
  }

  // Test interface for generic type parameter
  private interface TestService {
    String testMethod(String input);
  }
}