package com.obapps.schoolchatbot.core.util;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

public class PromptSymbolsTest {

  @Test
  public void testProcessTokens_withValidToken() {
    // Arrange
    String token = "[PromptSymbols.CHECKLIST_CONFIRMED]";

    // Act
    String result = PromptSymbols.processTokens(token);

    // Assert
    assertThat(result).isEqualTo("\u2705"); // ✅
  }

  @Test
  public void testProcessTokens_withInvalidToken() {
    // Arrange
    String token = "[PromptSymbols.INVALID_SYMBOL]";

    // Act
    String result = PromptSymbols.processTokens(token);

    // Assert
    assertThat(result).isEqualTo("[PromptSymbols.INVALID_SYMBOL]");
  }

  @Test
  public void testProcessTokens_withEmptyToken() {
    // Arrange
    String token = "";

    // Act
    String result = PromptSymbols.processTokens(token);

    // Assert
    assertThat(result).isEqualTo("");
  }

  @Test
  public void testProcessTokens_withNoBrackets() {
    // Arrange
    String token = "PromptSymbols.CHECKLIST_CONFIRMED";

    // Act
    String result = PromptSymbols.processTokens(token);

    // Assert
    assertThat(result).isEqualTo(token);
  }

  @Test
  public void testProcessTokens_withMultipleTokens() {
    // Arrange
    String token =
      "[PromptSymbols.CHECKLIST_CONFIRMED] and [PromptSymbols.WARNING]";

    // Act
    String result = PromptSymbols.processTokens(token);

    // Assert
    assertThat(result).isEqualTo("\u2705 and \u26A0"); // ✅ and ⚠️
  }

  @Test
  public void testProcessTokens_withSpecialCharacters() {
    // Arrange
    String token = "[PromptSymbols.CHECKLIST_CONFIRMED]!";

    // Act
    String result = PromptSymbols.processTokens(token);

    // Assert
    assertThat(result).isEqualTo("\u2705!"); // ✅_
  }
}
