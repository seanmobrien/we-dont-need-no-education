package com.obapps.schoolchatbot.chat.assistants.services.ai.phases.two;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.obapps.core.ai.factory.services.StandaloneModelClientFactory;
import com.obapps.core.util.Db;
import com.obapps.core.util.Strings;
import com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.InitialCtaOrResponsiveAction;
import java.io.FileReader;
import java.io.IOException;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.redisson.api.RQueue;

class CtaCategoryQueueProcessorTest {

  private CtaCategoryQueueProcessor processor;
  private StandaloneModelClientFactory mockFactory;
  private CtaBrokerService broker;
  private Db mockDb;

  @BeforeEach
  void setUp() {
    mockFactory = Mockito.mock(StandaloneModelClientFactory.class);
    mockDb = Mockito.mock(Db.class);
    broker = Mockito.mock(CtaBrokerService.class);
    processor = new CtaCategoryQueueProcessor(mockDb, mockFactory, broker);
  }

  @SuppressWarnings("unchecked")
  private IQueueProcessor.QueueBatchContext<
    InitialCtaOrResponsiveAction
  > makeBatch(List<InitialCtaOrResponsiveAction> items) {
    return BrokerManagedQueue.batchContext(Mockito.mock(RQueue.class), items);
  }

  @Test
  void testProcessBatch_NullModels() {
    Boolean result = processor.processBatch(null);
    assertFalse(result, "Processing a null batch should return false.");
  }

  @Test
  void testProcessBatch_EmptyModels() {
    Boolean result = processor.processBatch(makeBatch(Collections.emptyList()));
    assertFalse(result, "Processing an empty batch should return false.");
  }
  /*
  @Test
  void testProcessBatch_ValidModels() {
    List<InitialCtaOrResponsiveAction> models = List.of(
      new InitialCtaOrResponsiveAction()
        .builder()
        .createdOn(LocalDateTime.now())
        .build()
    );
    Boolean result = processor.processBatch(makeBatch(models));
    assertTrue(
      result,
      "Processing a valid batch currently returns false as per implementation."
    );
  }
  @Test
  void testProcessBatch_WithFile() throws SQLException {    
    processor = new CtaCategoryQueueProcessor(
      Db.getInstance(),
      mockFactory,
      broker
    );
    InitialCtaOrResponsiveAction[] source = null;
    String filePath =
      "C:\\Users\\seanm\\source\\repos\\work\\CtaReconciliationTargetCta.json";
    try (var reader = new FileReader(filePath)) {
      source = Strings.loadFromJsonStream(
        InitialCtaOrResponsiveAction[].class,
        reader
      );
    } catch (IOException e) {
      e.printStackTrace();
    }
    var idx = 0;
    var copy = new ArrayList<InitialCtaOrResponsiveAction>(100);
    for (InitialCtaOrResponsiveAction record : source) {
      if (record.getRecordId() == null || record.getRecordId().isEmpty()) {
        record.setRecordId(UUID.randomUUID().toString());
      }
      copy.add(record);
      idx++;
      if (idx > 100) {
        // break;
      }
    }
    when(broker.addToCategorizedQueue(any())).thenReturn(true);
    Boolean result = processor.processBatch(makeBatch(copy));

    assertTrue(
      result,
      "Processing a valid batch should return true if implemented correctly."
    );
  }
     */
}
