package com.obapps.schoolchatbot.chat.assistants.services.ai.phases.two;

import static org.junit.jupiter.api.Assertions.*;

import com.obapps.core.ai.factory.services.StandaloneModelClientFactory;
import com.obapps.core.util.Db;
import com.obapps.core.util.Strings;
import com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.CategorizedCallToAction;
import java.io.FileReader;
import java.io.IOException;
import java.sql.SQLException;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class CtaTitleIXAccessAssesmentQueueProcessorTest {

  private CtaTitleIXAccessAssesmentQueueProcessor processor;
  private StandaloneModelClientFactory mockFactory;
  private CtaBrokerService broker;
  private Db mockDb;

  @BeforeEach
  void setUp() {
    mockFactory = Mockito.mock(StandaloneModelClientFactory.class);
    mockDb = Mockito.mock(Db.class);
    broker = Mockito.mock(CtaBrokerService.class);
    processor = new CtaTitleIXAccessAssesmentQueueProcessor(
      mockDb,
      mockFactory,
      broker
    );
  }

  @Test
  void testProcessBatch_NullModels() {
    Boolean result = processor.processBatch(null);
    assertFalse(result, "Processing a null batch should return false.");
  }

  @Test
  void testProcessBatch_EmptyModels() {
    Boolean result = processor.processBatch(Collections.emptyList());
    assertFalse(result, "Processing an empty batch should return false.");
  }

  @Test
  void testProcessBatch_ValidModels() {
    List<CategorizedCallToAction> models = List.of(
      new CategorizedCallToAction()
    );
    Boolean result = processor.processBatch(models);
    assertTrue(
      result,
      "Processing a valid batch currently returns false as per implementation."
    );
  }

  @Test
  void testProcessBatch_WithFile() throws SQLException {
    processor = new CtaTitleIXAccessAssesmentQueueProcessor(
      Db.getInstance(),
      mockFactory,
      broker
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

    Boolean result = processor.processBatch(List.of(source));

    assertTrue(
      result,
      "Processing a valid batch should return true if implemented correctly."
    );
  }
}
