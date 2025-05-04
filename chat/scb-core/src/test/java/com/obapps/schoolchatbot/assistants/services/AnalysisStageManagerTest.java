package com.obapps.schoolchatbot.assistants.services;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.obapps.core.util.Db;
import com.obapps.schoolchatbot.core.assistants.services.AnalysisStageManager;
import com.obapps.schoolchatbot.core.assistants.types.BaseStageAnalystFactory;
import com.obapps.schoolchatbot.core.models.PendingStageAnalyst;
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
    List<
      com.obapps.schoolchatbot.core.models.PendingStageAnalyst
    > mockResultSet = new ArrayList<>();
    mockResultSet.add(
      new com.obapps.schoolchatbot.core.models.PendingStageAnalyst.Builder()
        .documentId(1)
        .build()
    );
    mockResultSet.add(
      new com.obapps.schoolchatbot.core.models.PendingStageAnalyst.Builder()
        .documentId(2)
        .build()
    );

    when(
      mockDb.selectObjects(
        eq(com.obapps.schoolchatbot.core.models.PendingStageAnalyst.class),
        anyString(),
        anyInt()
      )
    ).thenReturn(mockResultSet);
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

    verify(mockDb, times(1)).selectObjects(
      eq(com.obapps.schoolchatbot.core.models.PendingStageAnalyst.class),
      eq("SELECT * from document_unit_pending(?)"),
      eq(1)
    );
  }
}
