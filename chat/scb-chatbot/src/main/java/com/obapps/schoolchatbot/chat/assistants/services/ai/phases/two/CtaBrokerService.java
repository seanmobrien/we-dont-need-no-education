package com.obapps.schoolchatbot.chat.assistants.services.ai.phases.two;

import com.obapps.core.redis.IRedisConnection;
import com.obapps.core.redis.RedisConnectionFactory;
import com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.InitialCtaOrResponsiveAction;
import java.util.List;
import org.redisson.api.RQueue;

public class CtaBrokerService {

  private static final String QUEUE_NAME = "ctaQueue";

  public void addToQueue(InitialCtaOrResponsiveAction action) {
    IRedisConnection redisConnection = RedisConnectionFactory.getInstance();
    RQueue<InitialCtaOrResponsiveAction> queue = redisConnection
      .getRedisClient()
      .getQueue(QUEUE_NAME);
    queue.add(action);
  }

  public void addToQueue(List<InitialCtaOrResponsiveAction> actions) {
    IRedisConnection redisConnection = RedisConnectionFactory.getInstance();
    RQueue<InitialCtaOrResponsiveAction> queue = redisConnection
      .getRedisClient()
      .getQueue(QUEUE_NAME);
    queue.addAll(actions);
  }
}
