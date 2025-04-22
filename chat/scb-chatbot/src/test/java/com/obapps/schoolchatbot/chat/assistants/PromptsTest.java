package com.obapps.schoolchatbot.chat.assistants;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

public class PromptsTest {

  @Test
  public void testMatchesContinueExtraction_withValidPrompt() {
    // Arrange
    String validPrompt =
      "A total of 5 🧾 Response Objects have been found after 2 iterations.\nPlease Continue.";

    // Act
    boolean result = Prompts.matchesContinueExtraction(validPrompt);

    // Assert
    assertThat(result).isTrue();
  }

  @Test
  public void testMatchesContinueExtraction_withInvalidPrompt() {
    // Arrange
    String invalidPrompt =
      "A total of 5 Response Objects have been found after 2 iterations. Continue";

    // Act
    boolean result = Prompts.matchesContinueExtraction(invalidPrompt);

    // Assert
    assertThat(result).isFalse();
  }

  @Test
  public void testMatchesContinueExtraction_withEmptyString() {
    // Arrange
    String emptyPrompt = "";

    // Act
    boolean result = Prompts.matchesContinueExtraction(emptyPrompt);

    // Assert
    assertThat(result).isFalse();
  }

  @Test
  public void testMatchesContinueExtraction_withPartialMatch() {
    // Arrange
    String partialPrompt =
      "A total of 5 🧾 Response Objects have been found after 2 iterations.";

    // Act
    boolean result = Prompts.matchesContinueExtraction(partialPrompt);

    // Assert
    assertThat(result).isFalse();
  }

  @Test
  public void testMatchesContinueExtraction_withDifferentFormat() {
    // Arrange
    String differentFormatPrompt =
      "Found 5 🧾 Response Objects after 2 iterations. Please Continue";

    // Act
    boolean result = Prompts.matchesContinueExtraction(differentFormatPrompt);

    // Assert
    assertThat(result).isFalse();
  }
}
