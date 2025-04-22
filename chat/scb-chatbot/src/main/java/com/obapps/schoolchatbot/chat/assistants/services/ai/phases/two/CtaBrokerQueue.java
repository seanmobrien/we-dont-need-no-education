package com.obapps.schoolchatbot.chat.assistants.services.ai.phases.two;

import com.obapps.core.redis.IRedisConnection;
import com.obapps.core.redis.RedisConnectionFactory;
import com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.InitialCtaOrResponsiveAction;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.redisson.api.RQueue;

public class CtaBrokerQueue {

  private static final String QUEUE_NAME = "ctaQueue";
  private static final ScheduledExecutorService scheduler =
    Executors.newScheduledThreadPool(1);
  private static final AtomicInteger lastQueueSize = new AtomicInteger(0);

  public CtaBrokerQueue() {
    scheduler.scheduleAtFixedRate(this::processQueue, 0, 3, TimeUnit.MINUTES);
  }

  private void processQueue() {
    IRedisConnection redisConnection = RedisConnectionFactory.getInstance();
    RQueue<InitialCtaOrResponsiveAction> queue = redisConnection
      .getRedisClient()
      .getQueue(QUEUE_NAME);

    int currentQueueSize = queue.size();
    if (
      currentQueueSize >= 30 ||
      (currentQueueSize > 0 && currentQueueSize == lastQueueSize.get())
    ) {
      List<InitialCtaOrResponsiveAction> batch = new ArrayList<>();
      while (!queue.isEmpty()) {
        InitialCtaOrResponsiveAction action = queue.poll();
        if (action != null) {
          batch.add(action);
        }
      }

      if (!batch.isEmpty()) {
        boolean success = processBatch(batch);
        if (!success) {
          queue.addAll(batch); // Add the batch back to the queue if processing fails
        }
      }
    }

    lastQueueSize.set(currentQueueSize);
  }

  private boolean processBatch(List<InitialCtaOrResponsiveAction> batch) {
    try {
      for (InitialCtaOrResponsiveAction action : batch) {
        action.saveToDb(null); // Replace null with actual Db instance
      }
      return true;
    } catch (Exception e) {
      e.printStackTrace(); // Log the exception
      return false;
    }
  }
}
