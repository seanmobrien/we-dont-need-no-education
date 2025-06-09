package com.obapps.core.util;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

public class McpEnvVarsTest {

  @Test
  public void testGetMcpServerUrlReturnsEmptyWhenNotSet() {
    EnvVars envVars = EnvVars.getInstance();
    String mcpServerUrl = envVars.getMcpServerUrl();
    // Since the environment variable is not set in test environment, it should return empty string
    assertThat(mcpServerUrl).isEqualTo("");
  }
}