package com.obapps.schoolchatbot.models;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import com.obapps.core.util.Db;
import com.obapps.schoolchatbot.core.models.HistoricKeyPoint;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
public class HistoricKeyPointTests {

  @Mock
  Db dbMock;

  Map<String, Object> makeMockRecord() {
    Map<String, Object> expectedRecord = new HashMap<>();
    expectedRecord.put("property_id", (Object) UUID.randomUUID());
    expectedRecord.put("email_property_type_id", (Object) 9);
    expectedRecord.put("email_id", (Object) UUID.randomUUID());
    expectedRecord.put("document_id", (Object) 100);
    expectedRecord.put("key_note", (Object) "from mock");
    expectedRecord.put(
      "created_on",
      (Object) java.sql.Timestamp.valueOf(
        LocalDateTime.of(2025, 4, 6, 14, 49, 26)
      )
    );
    expectedRecord.put("relevance", (Object) 4.2);
    expectedRecord.put("compliance", (Object) 3.0);
    expectedRecord.put("severity_ranking", (Object) 2);
    expectedRecord.put(
      "policy_basis",
      (Object) List.of("Policy A", "Policy B")
    );
    expectedRecord.put("tags", (Object) List.of("one", "two", "three"));
    expectedRecord.put("inferred", (Object) true);
    expectedRecord.put("from_this_message", (Object) null);
    return expectedRecord;
  }

  @Test
  void testGetKeyPointHistoryId() {
    var expectedRecord = makeMockRecord();
    when(dbMock.selectRecords(anyString(), anyInt(), any())).thenReturn(
      List.of(expectedRecord)
    );

    HistoricKeyPoint result = assertDoesNotThrow(() ->
      HistoricKeyPoint.getForId(dbMock, UUID.randomUUID(), 98)
    );
    assertNotNull(result, "Result should not be null");
    assertEquals(expectedRecord.get("key_note"), result.getPropertyValue());
    assertEquals(expectedRecord.get("property_id"), result.getPropertyId());
  }

  @Test
  void testGetKeyPointHistoryForDocument() {
    var expectedRecord = makeMockRecord();
    when(dbMock.selectRecords(anyString(), anyInt())).thenReturn(
      List.of(expectedRecord)
    );

    List<HistoricKeyPoint> result = assertDoesNotThrow(() ->
      HistoricKeyPoint.getKeyPointHistoryForDocument(dbMock, 98)
    );
    assertNotNull(result, "Result should not be null");
    assertFalse(result.isEmpty(), "Result should not be empty");
    assertEquals(1, result.size(), "Result size should match expected size");
    var record = result.get(0);
    assertEquals(expectedRecord.get("key_note"), record.getPropertyValue());
    assertEquals(expectedRecord.get("property_id"), record.getPropertyId());
  }

  @Test
  void testSearchForKeyPoints() throws SQLException {
    var mockRecord = makeMockRecord();

    when(
      dbMock.selectRecords(anyString(), any(), any(), any(), any(), any())
    ).thenReturn(List.of(mockRecord));

    List<HistoricKeyPoint> result = HistoricKeyPoint.searchForKeyPoints(
      dbMock,
      "121.045",
      "",
      "",
      true,
      1
    );

    assertEquals(1, result.size());
    HistoricKeyPoint keyPoint = result.get(0);
    assertEquals(mockRecord.get("key_note"), keyPoint.getPropertyValue());
    assertEquals(mockRecord.get("property_id"), keyPoint.getPropertyId());
  }

  @Test
  void testBuilder() {
    HistoricKeyPoint keyPoint = HistoricKeyPoint.builder()
      .fromThisMessage(false)
      .propertyId(null)
      .fromThisMessage(true)
      .propertyValue("Test Value")
      .build();

    assertNotNull(keyPoint);
    assertTrue(keyPoint.isFromThisMessage());
    assertEquals("Test Value", keyPoint.getPropertyValue());
  }
}
