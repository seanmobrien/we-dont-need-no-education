package com.obapps.core.util;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.*;

class EnvVarsTests {

  @Test
  public void testEnvVars() {
    // Test if the environment variable is set correctly
    var target = EnvVars.getInstance();
    var rootUrl = target.getRestService().getRootUrl();
    assertNotNull(
      rootUrl,
      "Environment variable MY_ENV_VAR should not be null"
    );
    assertEquals(
      "http://localhost:3000",
      rootUrl,
      "Environment variable MY_ENV_VAR should have the expected value"
    );
  }
}
