package com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

public class CategorizedCallToActionTest {

  @Test
  public void testBuilder_withAllFields() {
    // Arrange
    String recordId = "12345";
    Integer reasonablyTitleIx = 8;
    List<String> reasonablyTitleIxReasons = List.of("Reason 1", "Reason 2");
    List<UUID> categories = List.of(UUID.randomUUID());

    // Act
    CategorizedCallToAction action = CategorizedCallToAction.builder()
      .recordId(recordId)
      .reasonablyTitleIx(reasonablyTitleIx)
      .reasonablyTitleIxReasons(reasonablyTitleIxReasons)
      .categories(categories)
      .build();

    // Assert
    assertThat(action.getRecordId()).isEqualTo(recordId);
    assertThat(action.getReasonablyTitleIx()).isEqualTo(reasonablyTitleIx);
    assertThat(action.getReasonablyTitleIxReasons()).isEqualTo(
      reasonablyTitleIxReasons
    );
    assertThat(action.getCategories()).isEqualTo(categories);
  }

  @Test
  public void testBuilder_copy_fromInitial_KeepsRecord() {
    String recordId = "12345";
    var test = InitialCtaOrResponsiveAction.builder()
      .recordId(recordId)
      .build();
    var target = CategorizedCallToAction.builder().copy(test).build();
    assertThat(target.getRecordId()).isEqualTo(recordId);
  }

  @Test
  public void testBuilder_withPartialFields() {
    // Arrange
    String recordId = "67890";
    Integer reasonablyTitleIx = 5;

    // Act
    CategorizedCallToAction action = CategorizedCallToAction.builder()
      .recordId(recordId)
      .reasonablyTitleIx(reasonablyTitleIx)
      .build();

    // Assert
    assertThat(action.getRecordId()).isEqualTo(recordId);
    assertThat(action.getReasonablyTitleIx()).isEqualTo(reasonablyTitleIx);
    assertThat(action.getReasonablyTitleIxReasons()).isNull();
    assertThat(action.getCategories()).isNull();
  }

  @Test
  public void testBuilder_copy() {
    // Arrange
    CategorizedCallToAction original = CategorizedCallToAction.builder()
      .recordId("originalId")
      .reasonablyTitleIx(7)
      .reasonablyTitleIxReasons(List.of("Original Reason"))
      .categories(List.of(UUID.randomUUID()))
      .build();

    // Act
    CategorizedCallToAction copy = CategorizedCallToAction.builder()
      .copy(original)
      .build();

    // Assert
    assertThat(copy.getRecordId()).isEqualTo(original.getRecordId());
    assertThat(copy.getReasonablyTitleIx()).isEqualTo(
      original.getReasonablyTitleIx()
    );
    assertThat(copy.getReasonablyTitleIxReasons()).isEqualTo(
      original.getReasonablyTitleIxReasons()
    );
    assertThat(copy.getCategories()).isEqualTo(original.getCategories());
  }

  @Test
  public void testBuilder_withEmptyFields() {
    // Act
    CategorizedCallToAction action = CategorizedCallToAction.builder().build();

    // Assert
    assertThat(action.getRecordId()).isNull();
    assertThat(action.getReasonablyTitleIx()).isNull();
    assertThat(action.getReasonablyTitleIxReasons()).isNull();
    assertThat(action.getCategories()).isNull();
  }
}
