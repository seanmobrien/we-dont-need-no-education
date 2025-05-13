package com.obapps.schoolchatbot.chat.assistants.services.ai.phases.two;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

import com.obapps.core.ai.factory.services.StandaloneModelClientFactory;
import com.obapps.core.util.Db;
import com.obapps.core.util.Strings;
import com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.InitialCtaOrResponsiveAction;
import java.io.FileReader;
import java.io.IOException;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.redisson.api.RQueue;

class ResponsiveActionAssignmentQueueProcessorTest {

  private ResponsiveActionAssignmentQueueProcessor processor;
  private Db mockDb;
  private StandaloneModelClientFactory mockFactory;
  private CtaBrokerService mockBrokerService;

  @SuppressWarnings("unchecked")
  private IQueueProcessor.QueueBatchContext<
    InitialCtaOrResponsiveAction
  > makeBatch(List<InitialCtaOrResponsiveAction> items) {
    return BrokerManagedQueue.batchContext(Mockito.mock(RQueue.class), items);
  }

  @BeforeEach
  void setUp() {
    mockDb = mock(Db.class);
    mockFactory = mock(StandaloneModelClientFactory.class);
    mockBrokerService = mock(CtaBrokerService.class);
    processor = new ResponsiveActionAssignmentQueueProcessor(
      mockDb,
      mockFactory,
      mockBrokerService
    );
  }

  @Test
  void testProcessBatch_WithFile() throws SQLException {
    processor = new ResponsiveActionAssignmentQueueProcessor(
      Db.getInstance(),
      new StandaloneModelClientFactory(),
      mockBrokerService
    );
    InitialCtaOrResponsiveAction[] source = null;
    //.json
    String filePath =
      "C:\\Users\\seanm\\source\\repos\\work\\CtaReconciliationTargetResponsiveAction.json";
    //"C:\\Users\\seanm\\source\\repos\\work\\queue_ctareconciliationtargetresponsiveaction.json";
    try (var reader = new FileReader(filePath)) {
      source = Strings.loadFromJsonStream(
        InitialCtaOrResponsiveAction[].class,
        reader
      );
    } catch (IOException e) {
      e.printStackTrace();
    }
    var copy = new ArrayList<InitialCtaOrResponsiveAction>();
    for (var idx = 0; idx < 1; idx++) {
      var item = source[idx + 26];
      if (item.recordId == null || item.recordId.isEmpty()) {
        item.recordId = UUID.randomUUID().toString();
      }
      copy.add(item);
    }
    Boolean result = processor.processBatch(makeBatch(copy));

    assertTrue(
      result,
      "Processing a valid batch should return true if implemented correctly."
    );
  }
}
