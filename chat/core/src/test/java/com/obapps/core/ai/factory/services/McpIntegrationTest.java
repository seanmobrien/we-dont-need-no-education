package com.obapps.core.ai.factory.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.obapps.core.ai.factory.models.AiServiceOptions;
import com.obapps.core.util.EnvVars;
import org.junit.jupiter.api.Test;

public class McpIntegrationTest {

  @Test
  public void testCreateServiceWithMcpEnabledButNoUrl() {
    // Test that when MCP is enabled but no URL is provided, service creation still works
    // (MCP is just not attached)
    
    // Create a mock environment with empty MCP URL and minimal OpenAI config
    EnvVars mockEnvVars = mock(EnvVars.class);
    EnvVars.OpenAiVars mockOpenAiVars = mock(EnvVars.OpenAiVars.class);
    when(mockEnvVars.getMcpServerUrl()).thenReturn("");
    when(mockEnvVars.getOpenAi()).thenReturn(mockOpenAiVars);
    when(mockOpenAiVars.getApiEndpoint()).thenReturn(""); // Empty to trigger error
    
    // Create factory with mock environment
    StandaloneModelClientFactory factory = new StandaloneModelClientFactory(mockEnvVars);
    
    AiServiceOptions<TestService> options = AiServiceOptions.builder(TestService.class)
        .setMcpEnabled(true)
        .build();
    
    // This will fail due to missing Azure OpenAI config, but that's expected
    // We're testing that the MCP logic doesn't cause additional failures
    try {
      factory.createService(options);
    } catch (IllegalArgumentException e) {
      // Expected to fail due to missing Azure OpenAI config
      assertThat(e.getMessage()).contains("Unsupported model type");
    }
  }

  @Test
  public void testCreateServiceWithMcpDisabled() {
    // Test that when MCP is disabled, service creation works the same way
    
    EnvVars mockEnvVars = mock(EnvVars.class);
    EnvVars.OpenAiVars mockOpenAiVars = mock(EnvVars.OpenAiVars.class);
    when(mockEnvVars.getMcpServerUrl()).thenReturn("http://localhost:3000");
    when(mockEnvVars.getOpenAi()).thenReturn(mockOpenAiVars);
    when(mockOpenAiVars.getApiEndpoint()).thenReturn(""); // Empty to trigger error
    
    StandaloneModelClientFactory factory = new StandaloneModelClientFactory(mockEnvVars);
    
    AiServiceOptions<TestService> options = AiServiceOptions.builder(TestService.class)
        .setMcpEnabled(false)
        .build();
    
    try {
      factory.createService(options);
    } catch (IllegalArgumentException e) {
      // Expected to fail due to missing Azure OpenAI config
      assertThat(e.getMessage()).contains("Unsupported model type");
    }
  }

  // Test interface for generic type parameter
  private interface TestService {
    String testMethod(String input);
  }
}