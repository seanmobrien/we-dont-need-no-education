package com.obapps.schoolchatbot.chat.assistants.services.ai.phases.two;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.obapps.core.redis.IRedisConnection;
import com.obapps.schoolchatbot.chat.MessageQueueName;
import com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.InitialCtaOrResponsiveAction;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

public class CtaBrokerQueueTest {

  private BrokerManagedQueue<InitialCtaOrResponsiveAction> queue;

  @Mock
  private IRedisConnection mockRedis;

  @Mock
  private IQueueProcessor<InitialCtaOrResponsiveAction, Boolean> mockProcessor;

  @BeforeEach
  public void setUp() {
    MockitoAnnotations.openMocks(this);
    queue = new TestableCtaBrokerQueue(mockRedis, mockProcessor);
  }

  @Test
  public void testProcessBatch_Success() {
    List<InitialCtaOrResponsiveAction> batch = new ArrayList<>();
    batch.add(new InitialCtaOrResponsiveAction());
    when(mockProcessor.processBatch(batch)).thenReturn(true);
    Boolean result = queue.processBatch(batch);
    assertTrue(result);
    verify(mockProcessor, times(1)).processBatch(batch);
  }

  @Test
  public void testProcessBatch_Failure() {
    List<InitialCtaOrResponsiveAction> batch = new ArrayList<>();
    when(mockProcessor.processBatch(batch)).thenThrow(
      new RuntimeException("Processing failed")
    );

    Boolean result = queue.processBatch(batch);

    assertFalse(result);
    verify(mockProcessor, times(1)).processBatch(batch);
  }

  // Subclass to expose protected methods for testing
  private static class TestableCtaBrokerQueue
    extends BrokerManagedQueue<InitialCtaOrResponsiveAction> {

    public TestableCtaBrokerQueue(
      IRedisConnection redis,
      IQueueProcessor<InitialCtaOrResponsiveAction, ?> processor
    ) {
      super(processor, redis, null);
    }

    @Override
    protected String getQueueName() {
      return MessageQueueName.CtaReconciliationTargetCta;
    }

    @Override
    protected Boolean processBatch(List<InitialCtaOrResponsiveAction> batch) {
      return super.processBatch(batch);
    }
  }
}
