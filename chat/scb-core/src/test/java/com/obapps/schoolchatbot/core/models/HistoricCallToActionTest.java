package com.obapps.schoolchatbot.core.models;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.obapps.core.util.Db;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for the {@link HistoricCallToAction} class.
 */
public class HistoricCallToActionTest {

  private Db mockDb;

  @BeforeEach
  void setUp() {
    mockDb = mock(Db.class);
  }

  @Test
  void testGetCallsToActionForDocument() throws SQLException {
    // Arrange
    int documentId = 123;
    List<Map<String, Object>> mockRecords = new ArrayList<>();

    Map<String, Object> record1 = new HashMap<>();
    record1.put("action_property_id", UUID.randomUUID());
    record1.put("opened_date", LocalDate.now());
    record1.put("completion_percentage", 50.0);
    record1.put("response_timestamp", null);
    mockRecords.add(record1);

    Map<String, Object> record2 = new HashMap<>();
    record2.put("action_property_id", record1.get("action_property_id"));
    record2.put("response_timestamp", LocalDateTime.now());
    record2.put("completion_percentage", 75.0);
    mockRecords.add(record2);

    when(
      mockDb.selectRecords(
        "SELECT * FROM document_unit_cta_history(?, true)",
        documentId
      )
    ).thenReturn(mockRecords);

    // Act
    List<HistoricCallToAction> result =
      HistoricCallToAction.getCallsToActionForDocument(mockDb, documentId);

    // Assert
    assertNotNull(result);
    assertEquals(1, result.size());

    HistoricCallToAction action = result.get(0);
    assertEquals(1, action.getResponses().size());
    assertEquals(50.0, action.getCompletionPercentage());
    assertEquals(75.0, action.getResponses().get(0).getCompletionPercentage());
  }

  @Test
  void testGetCallsToActionForDocumentWithMultipleResponses()
    throws SQLException {
    // Arrange
    int documentId = 123;
    List<Map<String, Object>> mockRecords = new ArrayList<>();

    UUID actionPropertyId = UUID.randomUUID();

    Map<String, Object> record1 = new HashMap<>();
    record1.put("action_property_id", actionPropertyId);
    record1.put("opened_date", LocalDate.now());
    record1.put("completion_percentage", 50.0);
    record1.put("response_timestamp", null);
    mockRecords.add(record1);

    Map<String, Object> record2 = new HashMap<>();
    record2.put("action_property_id", actionPropertyId);
    record2.put("response_timestamp", LocalDateTime.now().minusDays(1));
    record2.put("completion_percentage", 75.0);
    mockRecords.add(record2);

    Map<String, Object> record3 = new HashMap<>();
    record3.put("action_property_id", actionPropertyId);
    record3.put("response_timestamp", LocalDateTime.now());
    record3.put("completion_percentage", 90.0);
    mockRecords.add(record3);

    when(
      mockDb.selectRecords(
        "SELECT * FROM document_unit_cta_history(?, true)",
        documentId
      )
    ).thenReturn(mockRecords);

    // Act
    List<HistoricCallToAction> result =
      HistoricCallToAction.getCallsToActionForDocument(mockDb, documentId);

    // Assert
    assertNotNull(result);
    assertEquals(1, result.size());

    HistoricCallToAction action = result.get(0);
    assertEquals(2, action.getResponses().size());
    assertEquals(50.0, action.getCompletionPercentage());
    assertEquals(75.0, action.getResponses().get(0).getCompletionPercentage());
    assertEquals(90.0, action.getResponses().get(1).getCompletionPercentage());
  }
  /*
  @Test
  void actualGetCallsToActionWithValidActionPropertyIds() throws SQLException {
    var ret = HistoricCallToAction.getCallsToAction(
      Db.getInstance(),
      UUID.fromString("4a540321-f578-47e7-912b-f7145ab97774")
    );
    assertNotNull(ret);
    assertEquals(2, ret.getResponses().size());
  }
  */
}
