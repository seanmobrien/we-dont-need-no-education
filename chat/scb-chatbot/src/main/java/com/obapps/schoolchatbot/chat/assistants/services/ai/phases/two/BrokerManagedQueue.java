package com.obapps.schoolchatbot.chat.assistants.services.ai.phases.two;

import com.esotericsoftware.minlog.Log;
import com.obapps.core.redis.IRedisConnection;
import com.obapps.core.redis.RedisConnectionFactory;
import com.obapps.core.util.Strings;
import com.obapps.schoolchatbot.chat.assistants.services.ai.phases.IBrokerManagedQueue;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.redisson.api.RQueue;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class BrokerManagedQueue<TQueueItem> implements IBrokerManagedQueue {

  private static final ScheduledExecutorService scheduler =
    Executors.newScheduledThreadPool(3);
  private static final AtomicInteger lastQueueSize = new AtomicInteger(0);

  private final IQueueProcessor<TQueueItem, ?> processor;
  private final IRedisConnection redis;
  private final Options queueOptions;
  private ScheduledFuture<?> scheduledFuture;
  private Boolean isProcessing = false;
  private Logger log;

  public static class Options {

    public boolean isEnabled = true;
    public boolean writeToFile = false;
    public int minItemsToProcess = 30;
    public int pollIntervalMinuts = 3;

    public static Builder builder() {
      return new Builder();
    }

    public static class Builder {

      private final Options options;

      public Builder() {
        options = new Options();
      }

      public Builder setEnabled(boolean isEnabled) {
        options.isEnabled = isEnabled;
        return this;
      }

      public Builder setWriteToFile(boolean writeToFile) {
        options.writeToFile = writeToFile;
        return this;
      }

      public Builder setMinItemsToProcess(int minItemsToProcess) {
        options.minItemsToProcess = minItemsToProcess;
        return this;
      }

      public Builder setPollIntervalMinutes(int pollIntervalMinuts) {
        options.pollIntervalMinuts = pollIntervalMinuts;
        return this;
      }

      public Options build() {
        return options;
      }
    }
  }

  public BrokerManagedQueue(IQueueProcessor<TQueueItem, ?> processor) {
    this(processor, null, null);
  }

  public BrokerManagedQueue(
    IQueueProcessor<TQueueItem, ?> processor,
    Options options
  ) {
    this(processor, null, null);
  }

  public BrokerManagedQueue(
    IQueueProcessor<TQueueItem, ?> processor,
    IRedisConnection redis,
    Options options
  ) {
    if (processor == null) {
      throw new IllegalArgumentException("Processor cannot be null");
    }
    log = LoggerFactory.getLogger(this.getClass());
    queueOptions = options == null ? new Options() : options;
    this.processor = processor;
    this.redis = redis == null ? RedisConnectionFactory.getInstance() : redis;
  }

  protected String getQueueName() {
    return processor.getQueueName();
  }

  @Override
  public void Start() {
    if (scheduledFuture == null || scheduledFuture.isCancelled()) {
      scheduledFuture = scheduler.scheduleAtFixedRate(
        this::processQueue,
        0,
        queueOptions.pollIntervalMinuts,
        TimeUnit.MINUTES
      );
      log.info(
        "Started processing queue {} every {} minutes",
        getQueueName(),
        queueOptions.pollIntervalMinuts
      );
    }
  }

  @Override
  public void Stop() {
    if (scheduledFuture != null && !scheduledFuture.isCancelled()) {
      scheduledFuture.cancel(false);
      scheduledFuture = null;
      log.info("Stopped processing queue {}", getQueueName());
    }
  }

  @Override
  public Boolean getIsRuning() {
    return scheduledFuture != null && !scheduledFuture.isCancelled();
  }

  protected void processQueue() {
    List<TQueueItem> batch = new ArrayList<>();
    RQueue<TQueueItem> queue = null;
    try {
      if (isProcessing) {
        log.debug(
          "{} is already processing, skipping this run.",
          getQueueName()
        );
        return;
      }
      isProcessing = true;
      IRedisConnection redisConnection = redis == null
        ? RedisConnectionFactory.getInstance()
        : redis;
      var queueName = getQueueName();
      if (queueName == null) {
        return; // No queue name provided, nothing to process
      }
      queue = redisConnection.getRedisClient().getQueue(queueName);
      int currentQueueSize = queue.size();
      if (
        currentQueueSize >= queueOptions.minItemsToProcess ||
        (currentQueueSize > 0 && currentQueueSize == lastQueueSize.get())
      ) {
        while (!queue.isEmpty()) {
          TQueueItem action = queue.poll();
          if (action != null) {
            batch.add(action);
          }
        }

        if (!batch.isEmpty()) {
          if (queueOptions.writeToFile) {
            flushBatchToFile(batch);
          }
          if (queueOptions.isEnabled) {
            log.info(
              "Processing batch of {} items from queue {}",
              batch.size(),
              getQueueName()
            );
            Boolean success = processBatch(batch);
            if (!success.equals(Boolean.TRUE)) {
              log.error(
                "Failed to process batch of {} items from queue {}",
                batch.size(),
                getQueueName()
              );
              queue.addAll(batch); // Add the batch back to the queue if processing fails
            }
          } else {
            log.trace(
              "Skipping processing for {} items from queue {} (disabled)",
              batch.size(),
              getQueueName()
            );
            queue.addAll(batch); // Add the batch back to the queue if processing fails
          }
        }
      }
      lastQueueSize.set(currentQueueSize);
    } catch (Exception e) {
      log.error(
        "An error occurred while processing the queue {}",
        getQueueName(),
        e
      );
      if (batch != null && !batch.isEmpty()) {
        log.error(
          "Failed to process batch of {} items from queue {}",
          batch.size(),
          getQueueName()
        );
        if (queue != null) {
          try {
            queue.addAll(batch);
          } catch (Exception ex) {
            log.error(
              "Failed to add items back to the queue {}",
              getQueueName(),
              ex
            );
          }
        }
      }
    } finally {
      isProcessing = false;
    }
  }

  protected void flushBatchToFile(List<TQueueItem> batch) {
    try {
      String queueName = getQueueName().toLowerCase();
      String filePath =
        "C:\\Users\\seanm\\source\\repos\\work\\queue_" + queueName + ".json";
      java.nio.file.Path path = java.nio.file.Paths.get(filePath);
      java.nio.file.Files.createDirectories(path.getParent());
      java.nio.file.Files.write(
        path,
        Strings.objectMapperFactory().writeValueAsBytes(batch)
      );
    } catch (Exception e) {
      e.printStackTrace(); // Log the exception
    }
  }

  protected Boolean processBatch(List<TQueueItem> batch) {
    try {
      return processor.processBatch(batch);
    } catch (Exception e) {
      Log.error(
        "An error occurred while processing a batch on queue {}",
        getQueueName(),
        e
      );
      return false;
    }
  }
}
