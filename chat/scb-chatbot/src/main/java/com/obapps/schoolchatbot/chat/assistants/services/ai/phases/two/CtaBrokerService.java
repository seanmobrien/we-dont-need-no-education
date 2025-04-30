package com.obapps.schoolchatbot.chat.assistants.services.ai.phases.two;

import com.obapps.core.redis.IRedisConnection;
import com.obapps.core.redis.RedisConnectionFactory;
import com.obapps.core.util.Db;
import com.obapps.core.util.Strings;
import com.obapps.schoolchatbot.chat.MessageQueueName;
import com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.ActionType;
import com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.CategorizedCallToAction;
import com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.InitialCtaOrResponsiveAction;
import com.obapps.schoolchatbot.core.models.DocumentUnitAnalysisStageAudit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class CtaBrokerService {

  private final Logger log;
  private final Db db;
  private final IRedisConnection redis;

  public CtaBrokerService() {
    this(null, null);
  }

  public CtaBrokerService(IRedisConnection redis, Db db) {
    super();
    log = LoggerFactory.getLogger(CtaBrokerService.class);
    this.db = db;
    this.redis = redis == null ? RedisConnectionFactory.getInstance() : redis;
  }

  protected <TItem> Boolean addItemToQueue(TItem item, String queueName) {
    try {
      var queue = redis.getRedisClient().getQueue(queueName);
      queue.add(item);
      queue.clearExpire();
      log.info(
        "Added item to queue [{}].\n\t {}",
        queue.getName(),
        Strings.safelySerializeAsJson(item)
      );
      return true;
    } catch (Exception e) {
      log.error("Error adding item to queue: {}", e.getMessage(), e);
    }
    return false;
  }

  public Boolean addToQueue(InitialCtaOrResponsiveAction action) {
    try {
      if (action.getRecordId() == null || action.getRecordId().isEmpty()) {
        action.setRecordId(UUID.randomUUID().toString());
      }
      String queueName;
      switch (action.actionType) {
        case ActionType.CTA:
          queueName = MessageQueueName.CtaReconciliationTargetCta;
          break;
        case ActionType.RESPONSIVE_ACTION:
          queueName = MessageQueueName.CtaReconciliationTargetResponsiveAction;
          break;
        default:
          throw new RuntimeException(
            "Unrecognized action type: " + action.actionType
          );
      }
      return addItemToQueue(action, queueName);
    } catch (Exception e) {
      auditActionFailure(action, e);
    }
    return false;
  }

  public void addToQueue(List<InitialCtaOrResponsiveAction> actions) {
    actions.forEach(this::addToQueue);
  }

  public Boolean addToCategorizedQueue(CategorizedCallToAction item) {
    var queue = redis
      .getRedisClient()
      .getQueue(MessageQueueName.CtaCategorizedCta);
    if (queue == null) {
      log.error("Queue not found: {}", MessageQueueName.CtaCategorizedCta);
      return false;
    }
    var found = new ArrayList<CategorizedCallToAction>();
    queue.forEach(a -> {
      if (found.isEmpty() && a instanceof CategorizedCallToAction) {
        CategorizedCallToAction categorizedCta = (CategorizedCallToAction) a;
        if (categorizedCta.isMatch(item)) {
          found.add(categorizedCta);
          queue.remove(categorizedCta);
          categorizedCta.merge(item);
        }
      }
    });
    return addItemToQueue(
      found.isEmpty() ? item : found.get(0),
      MessageQueueName.CtaCategorizedCta
    );
  }

  protected void auditActionFailure(
    InitialCtaOrResponsiveAction action,
    Exception e
  ) {
    var errorMessage = String.format(
      "Error adding action to queue: %s\n\t%s",
      e.getMessage(),
      Strings.safelySerializeAsJson(action)
    );
    log.error(errorMessage, e);
    if (action.getDocumentId() > 0) {
      try {
        DocumentUnitAnalysisStageAudit.builder()
          .documentId(action.getDocumentId())
          .iterationId(1000)
          .completionSignalled(false)
          .analysisStageId(2)
          .message(errorMessage)
          .build()
          .saveToDb(db == null ? Db.getInstance() : db);
      } catch (java.sql.SQLException e2) {
        // Suppress - already in error state
      }
    }
  }
}
