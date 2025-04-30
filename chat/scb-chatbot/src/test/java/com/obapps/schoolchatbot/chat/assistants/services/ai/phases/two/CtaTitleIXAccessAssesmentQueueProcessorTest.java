package com.obapps.schoolchatbot.chat.assistants.services.ai.phases.two;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.obapps.core.ai.factory.services.StandaloneModelClientFactory;
import com.obapps.core.util.Db;
import com.obapps.core.util.Strings;
import com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.CategorizedCallToAction;
import java.io.FileReader;
import java.io.IOException;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.redisson.api.RQueue;

class CtaTitleIXAccessAssesmentQueueProcessorTest {

  private CtaTitleIXAccessAssesmentQueueProcessor processor;
  private StandaloneModelClientFactory mockFactory;
  private Db mockDb;
  private RQueue<CategorizedCallToAction> q;

  @BeforeEach
  @SuppressWarnings("unchecked")
  void setUp() {
    mockFactory = Mockito.mock(StandaloneModelClientFactory.class);
    mockDb = Mockito.mock(Db.class);
    processor = new CtaTitleIXAccessAssesmentQueueProcessor(
      mockDb,
      mockFactory
    );
    q = Mockito.mock(RQueue.class);
    when(q.add(any())).thenReturn(true);
    when(q.removeAll(any())).thenReturn(true);
    when(q.addAll(any())).thenReturn(true);
  }

  private IQueueProcessor.QueueBatchContext<CategorizedCallToAction> makeBatch(
    List<CategorizedCallToAction> items
  ) {
    return BrokerManagedQueue.batchContext(q, items);
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

  @Test
  void testProcessBatch_ValidModels() {
    List<CategorizedCallToAction> models = List.of(
      new CategorizedCallToAction()
    );
    Boolean result = processor.processBatch(makeBatch(models));
    assertTrue(
      result,
      "Processing a valid batch currently returns false as per implementation."
    );
  }

  @Test
  void testProcessBatch_WithFile() throws SQLException {
    processor = new CtaTitleIXAccessAssesmentQueueProcessor(
      Db.getInstance(),
      new StandaloneModelClientFactory()
    );
    CategorizedCallToAction[] source = null;
    String filePath =
      "C:\\Users\\seanm\\source\\repos\\work\\title9testdata.json";
    try (var reader = new FileReader(filePath)) {
      source = Strings.loadFromJsonStream(
        CategorizedCallToAction[].class,
        reader
      );
    } catch (IOException e) {
      e.printStackTrace();
    }
    var copy = new ArrayList<CategorizedCallToAction>();
    for (var idx = 0; idx < 20; idx++) {
      var item = source[idx + 20];
      copy.add(item);
    }
    Boolean result = processor.processBatch(makeBatch(copy));

    assertTrue(
      result,
      "Processing a valid batch should return true if implemented correctly."
    );
  }
}
