package com.obapps.schoolchatbot.assistants.services;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

import com.obapps.core.util.Db;
import com.obapps.schoolchatbot.core.assistants.services.AnalysisStageManager;
import com.obapps.schoolchatbot.core.assistants.types.BaseStageAnalystFactory;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AnalysisStageManagerTest {

  private Db mockDb;
  private BaseStageAnalystFactory mockStage;

  @BeforeEach
  void setUp() {
    mockDb = mock(Db.class);
    mockStage = mock(
      com.obapps.schoolchatbot.core.assistants.types.BaseStageAnalystFactory.class
    );

    // Mocking a sample result set
    List<List<Object>> mockResultSet = new ArrayList<>();
    List<Object> row1 = new ArrayList<>();
    row1.add(1); // document_id
    mockResultSet.add(row1);

    List<Object> row2 = new ArrayList<>();
    row2.add(2); // document_id
    mockResultSet.add(row2);

    when(mockDb.select(anyString(), anyInt())).thenReturn(mockResultSet);
  }

  @Test
  void testProcessDocuments_SuccessfulProcessing() {
    try {
      AnalysisStageManager manager = new AnalysisStageManager(
        1,
        mockDb,
        mockStage
      );
      manager.processDocuments();
    } catch (SQLException e) {
      throw new RuntimeException(e);
    }

    verify(mockDb, times(1)).select(
      "SELECT * FROM document_unit_pending(?)",
      1
    );
  }

  @Test
  void testProcessDocuments_ConsecutiveFailures() {
    // Mocking a result set with multiple rows
    List<List<Object>> mockResultSet = new ArrayList<>();
    List<Object> row1 = new ArrayList<>();
    row1.add(1); // document_id
    mockResultSet.add(row1);

    List<Object> row2 = new ArrayList<>();
    row2.add(2); // document_id
    mockResultSet.add(row2);

    List<Object> row3 = new ArrayList<>();
    row3.add(3); // document_id
    mockResultSet.add(row3);

    when(mockDb.select(anyString(), anyInt())).thenReturn(mockResultSet);

    try {
      AnalysisStageManager manager = new AnalysisStageManager(
        1,
        mockDb,
        mockStage
      );
      manager.processDocuments();
    } catch (SQLException e) {
      throw new RuntimeException(e);
    }

    verify(mockDb, times(1)).select(
      "SELECT * FROM document_unit_pending(?)",
      1
    );
  }

  @Test
  void testProcessDocuments_DatabaseError() throws SQLException {
    when(mockDb.select(anyString(), anyInt())).thenThrow(
      new SQLException("Database error")
    );

    try {
      AnalysisStageManager manager = new AnalysisStageManager(
        1,
        mockDb,
        mockStage
      );
      manager.processDocuments();
    } catch (SQLException e) {
      throw new RuntimeException(e);
    }

    verify(mockDb, times(1)).select(
      "SELECT * FROM document_unit_pending(?)",
      1
    );
  }
}
