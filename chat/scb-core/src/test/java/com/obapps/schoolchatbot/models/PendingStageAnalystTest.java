package com.obapps.schoolchatbot.models;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

import com.obapps.core.util.Db;
import com.obapps.schoolchatbot.core.models.PendingStageAnalyst;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

public class PendingStageAnalystTest {

  @Test
  public void testLoadForStage_fromDb() throws SQLException {
    // Arrange
    Db mockDb = Db.getInstance();

    // Act
    List<PendingStageAnalyst> result = PendingStageAnalyst.loadForStage(
      mockDb,
      1
    );

    // Assert
    assertThat(result).hasAtLeastOneElementOfType(PendingStageAnalyst.class);
    assertThat(result.get(0).getSentTimestamp()).isBefore(
      result.get(1).getSentTimestamp()
    );
  }

  @Test
  public void testLoadForStage_withValidData() {
    // Arrange
    Db mockDb = mock(Db.class);
    PendingStageAnalyst analyst1 = new PendingStageAnalyst();
    analyst1.setDocumentId(1);
    analyst1.setDocumentType("TypeA");
    analyst1.setEmailId(UUID.randomUUID());
    analyst1.setSentTimestamp(LocalDateTime.of(2023, 1, 1, 10, 0));

    PendingStageAnalyst analyst2 = new PendingStageAnalyst();
    analyst2.setDocumentId(2);
    analyst2.setDocumentType("TypeB");
    analyst2.setEmailId(UUID.randomUUID());
    analyst2.setSentTimestamp(LocalDateTime.of(2023, 1, 1, 9, 0));

    when(
      mockDb.selectObjects(
        PendingStageAnalyst.class,
        "SELECT * from document_unit_pending(?)",
        1
      )
    ).thenReturn(List.of(analyst1, analyst2));

    // Act
    List<PendingStageAnalyst> result = PendingStageAnalyst.loadForStage(
      mockDb,
      1
    );

    // Assert
    assertThat(result).hasSize(2);
    assertThat(result.get(0).getSentTimestamp()).isBefore(
      result.get(1).getSentTimestamp()
    );
    verify(mockDb, times(1)).selectObjects(
      PendingStageAnalyst.class,
      "SELECT * from document_unit_pending(?)",
      1
    );
  }

  @Test
  public void testLoadForStage_withEmptyResult() {
    // Arrange
    Db mockDb = mock(Db.class);
    when(
      mockDb.selectObjects(
        PendingStageAnalyst.class,
        "SELECT * from document_unit_pending(?)",
        1
      )
    ).thenReturn(List.of());

    // Act
    List<PendingStageAnalyst> result = PendingStageAnalyst.loadForStage(
      mockDb,
      1
    );

    // Assert
    assertThat(result).isEmpty();
    verify(mockDb, times(1)).selectObjects(
      PendingStageAnalyst.class,
      "SELECT * from document_unit_pending(?)",
      1
    );
  }

  @Test
  public void testGettersAndSetters() {
    // Arrange
    PendingStageAnalyst analyst = new PendingStageAnalyst();
    Integer documentId = 1;
    String documentType = "TypeA";
    UUID emailId = UUID.randomUUID();
    LocalDateTime sentTimestamp = LocalDateTime.now();

    // Act
    analyst.setDocumentId(documentId);
    analyst.setDocumentType(documentType);
    analyst.setEmailId(emailId);
    analyst.setSentTimestamp(sentTimestamp);

    // Assert
    assertThat(analyst.getDocumentId()).isEqualTo(documentId);
    assertThat(analyst.getDocumentType()).isEqualTo(documentType);
    assertThat(analyst.getEmailId()).isEqualTo(emailId);
    assertThat(analyst.getSentTimestamp()).isEqualTo(sentTimestamp);
  }
}
