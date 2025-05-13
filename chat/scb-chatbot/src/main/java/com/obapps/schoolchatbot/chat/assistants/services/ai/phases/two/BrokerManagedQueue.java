package com.obapps.schoolchatbot.chat.assistants.services.ai.phases.two;

import com.esotericsoftware.minlog.Log;
import com.obapps.core.redis.IRedisConnection;
import com.obapps.core.redis.RedisConnectionFactory;
import com.obapps.core.util.Strings;
import com.obapps.core.util.lists.WrappedList;
import com.obapps.schoolchatbot.chat.assistants.services.ai.phases.IBrokerManagedQueue;
import java.time.Instant;
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

/**
 * Represents a broker-managed queue that processes items in batches using a scheduler.
 * This class provides methods to start, stop, and process the queue, as well as manage its configuration options.
 *
 * @param <TQueueItem> the type of items in the queue
 */
public class BrokerManagedQueue<TQueueItem> implements IBrokerManagedQueue {

  /**
   * A scheduled executor service used to manage the scheduling of queue processing tasks.
   */
  private static final ScheduledExecutorService scheduler =
    Executors.newScheduledThreadPool(3);
  private static Boolean isShuttingDown = false;

  protected static Boolean hasShutdownBeenCalled() {
    return isShuttingDown;
  }

  /**
   * A list of all currently running broker-managed queues.
   */
  private static final ArrayList<IBrokerManagedQueue> runningQueues =
    new ArrayList<>();

  /**
   * Tracks the size of the queue during the last processing cycle.
   */
  private final AtomicInteger lastQueueSize = new AtomicInteger(0);

  /**
   * The processor responsible for handling items in the queue.
   */
  private final IQueueProcessor<TQueueItem, ?> processor;

  /**
   * The Redis connection used for queue operations.
   */
  private final IRedisConnection redis;

  /**
   * Configuration options for the queue.
   */
  private final Options queueOptions;

  /**
   * The scheduled future representing the queue processing task.
   */
  private ScheduledFuture<?> scheduledFuture;

  /**
   * The logger used for logging messages and errors.
   */
  private Logger log;

  /**
   * The {@code Options} class represents configuration options for the
   * BrokerManagedQueue. It provides a set of configurable parameters
   * and a builder for constructing instances of the {@code Options} class.
   *
   * <p>Configuration options include:
   * <ul>
   *   <li>{@code isEnabled} - Determines if the queue is enabled (default: true).</li>
   *   <li>{@code writeToFile} - Specifies whether to write data to a file (default: false).</li>
   *   <li>{@code minItemsToProcess} - Minimum number of items to process (default: 30).</li>
   *   <li>{@code maxItemsToProcess} - Maximum number of items to process (default: 100).</li>
   *   <li>{@code pollIntervalMinuts} - Polling interval in minutes (default: 3).</li>
   * </ul>
   *
   * <p>The {@code Options.Builder} class provides a fluent API for constructing
   * {@code Options} instances. Example usage:
   *
   * <pre>{@code
   * Options options = Options.builder()
   *     .setEnabled(true)
   *     .setWriteToFile(false)
   *     .setMinItemsToProcess(50)
   *     .setMaxItemsToProcess(200)
   *     .setPollIntervalMinutes(5)
   *     .build();
   * }</pre>
   */
  public static class Options {

    /**
     * Determines if the queue is enabled (default: true).
     */
    public boolean isEnabled = true;

    /**
     * Specifies whether to write data to a file (default: false).
     */
    public boolean writeToFile = false;

    /**
     * Minimum number of items to process (default: 30).
     */
    public int minItemsToProcess = 30;

    /**
     * Maximum number of items to process (default: 100).
     */
    public int maxItemsToProcess = 100;

    /**
     * Polling interval in minutes (default: 3).
     */
    public int pollIntervalMinutes = 3;

    /**
     * Creates a new builder for constructing Options instances.
     *
     * @return a new Options.Builder instance
     */
    public static Builder builder() {
      return new Builder();
    }

    /**
     * A builder class for constructing Options instances.
     */
    public static class Builder {

      /**
       * The Options instance being constructed.
       */
      private final Options options;

      /**
       * Initializes a new Builder instance.
       */
      public Builder() {
        options = new Options();
      }

      /**
       * Sets whether the queue is enabled.
       *
       * @param isEnabled true to enable the queue, false otherwise
       * @return the Builder instance
       */
      public Builder setEnabled(boolean isEnabled) {
        options.isEnabled = isEnabled;
        return this;
      }

      /**
       * Sets whether to write data to a file.
       *
       * @param writeToFile true to write data to a file, false otherwise
       * @return the Builder instance
       */
      public Builder setWriteToFile(boolean writeToFile) {
        options.writeToFile = writeToFile;
        return this;
      }

      /**
       * Sets the minimum number of items to process.
       *
       * @param minItemsToProcess the minimum number of items to process
       * @return the Builder instance
       */
      public Builder setMinItemsToProcess(int minItemsToProcess) {
        options.minItemsToProcess = minItemsToProcess;
        return this;
      }

      /**
       * Sets the maximum number of items to process.
       *
       * @param maxItemsToProcess the maximum number of items to process
       * @return the Builder instance
       */
      public Builder setMaxItemsToProcess(int maxItemsToProcess) {
        options.maxItemsToProcess = maxItemsToProcess;
        return this;
      }

      /**
       * Sets the polling interval in minutes.
       *
       * @param pollIntervalMinuts the polling interval in minutes
       * @return the Builder instance
       */
      public Builder setPollIntervalMinutes(int pollIntervalMinuts) {
        options.pollIntervalMinutes = pollIntervalMinuts;
        return this;
      }

      /**
       * Builds and returns the configured Options instance.
       *
       * @return the configured Options instance
       */
      public Options build() {
        return options;
      }
    }
  }

  /**
   * Initializes a new BrokerManagedQueue instance with the specified processor.
   *
   * @param processor the processor responsible for handling items in the queue
   */
  public BrokerManagedQueue(IQueueProcessor<TQueueItem, ?> processor) {
    this(processor, null, null);
  }

  /**
   * Initializes a new BrokerManagedQueue instance with the specified processor and options.
   *
   * @param processor the processor responsible for handling items in the queue
   * @param options the configuration options for the queue
   */
  public BrokerManagedQueue(
    IQueueProcessor<TQueueItem, ?> processor,
    Options options
  ) {
    this(processor, null, null);
  }

  /**
   * Initializes a new BrokerManagedQueue instance with the specified processor, Redis connection, and options.
   *
   * @param processor the processor responsible for handling items in the queue
   * @param redis the Redis connection used for queue operations
   * @param options the configuration options for the queue
   */
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

  /**
   * Retrieves the name of the queue managed by the processor.
   *
   * @return the name of the queue as a String
   */
  protected String getQueueName() {
    return processor.getQueueName();
  }

  /**
   * Shuts down all broker-managed queues and the associated scheduler.
   * This method ensures that all running queues are notified to stop,
   * and the scheduler is shut down gracefully if possible. If the scheduler
   * does not terminate within the specified timeout, it is forcibly shut down.
   *
   * The method performs the following steps:
   * 1. Checks if the scheduler is already shut down or terminated. If so, it exits early.
   * 2. Logs and prints the start time of the shutdown process.
   * 3. Notifies all running queues to stop without waiting for their completion.
   * 4. Initiates the shutdown of the scheduler and waits for its termination
   *    within a timeout of 90 seconds.
   * 5. If the scheduler does not terminate gracefully within the timeout,
   *    it is forcibly shut down.
   * 6. Logs and prints the status of the scheduler shutdown (graceful or forced).
   * 7. Performs a final cleanup by stopping all queues completely and clearing
   *    the list of running queues.
   * 8. Logs and prints the end time of the shutdown process, along with its
   *    duration and whether it was graceful.
   *
   * This method is synchronized to ensure thread safety during the shutdown process.
   */
  public static synchronized void shutdownAllQueues() {
    if (scheduler.isShutdown() || scheduler.isTerminated()) {
      return; // Scheduler already shut down
    }
    var log = LoggerFactory.getLogger(BrokerManagedQueue.class);
    var start = Instant.now();
    log.info("Starting shut down of all queues at {}", start);
    System.out.println("Starting shut down of all queues at " + start);
    // notify all queues to stop
    for (IBrokerManagedQueue queue : List.copyOf(runningQueues)) {
      queue.stop(false);
    }
    System.out.println(
      "Queue threads notified, initiating shutdown at " + start
    );
    // shutdown the scheduler
    scheduler.shutdown();
    Boolean graceful = true;
    try {
      // Give running tasks a chance to finish
      if (!scheduler.awaitTermination(90, TimeUnit.SECONDS)) {
        log.warn(
          "Scheduler did not terminate gracefully within the timeout. Forcing shutdown."
        );
        System.out.println(
          "Scheduler did not terminate gracefully within the timeout. Forcing shutdown."
        );
        // Force shutdown if tasks are still running after the timeout
        scheduler.shutdownNow();
        graceful = false;
      }
    } catch (InterruptedException e) {
      // Force shutdown if interrupted
      log.warn("Scheduler interrupted during shutdown. Forcing shutdown.", e);
      System.out.println(
        "Scheduler interrupted during shutdown. Forcing shutdown."
      );
      scheduler.shutdownNow();
      graceful = false;
    }
    System.out.println(
      "Scheduler shut down, queue cleanup began at " + Instant.now()
    );
    for (IBrokerManagedQueue q : List.copyOf(runningQueues)) {
      q.stop(true);
    }
    runningQueues.clear();
    var end = Instant.now();
    log.info(
      "Finished shut down of all queues at {}. Graceful: {}. Duration: {} seconds",
      end,
      graceful,
      (end.getEpochSecond() - start.getEpochSecond())
    );
    System.out.println(
      "Finished shut down of all queues at " +
      end +
      ". Graceful: " +
      graceful +
      ". Duration: " +
      (end.getEpochSecond() - start.getEpochSecond()) +
      " seconds"
    );
  }

  /**
   * Shuts down the broker-managed queue by invoking the shutdown process for all associated queues.
   * This ensures that all resources are properly released and no further tasks are processed.
   */
  @Override
  public void shutdown() {
    shutdownAllQueues();
  }

  /**
   * Starts the processing of the queue if it is not already running or has been cancelled.
   * This method schedules the queue processing task to run at a fixed interval defined
   * by {@code queueOptions.pollIntervalMinuts}. The task is executed using a scheduler.
   *
   * If the queue is successfully started, it is added to the list of running queues and
   * a log message is generated indicating the queue name and the polling interval.
   */
  @Override
  public void start() {
    if (scheduledFuture == null || scheduledFuture.isCancelled()) {
      scheduledFuture = scheduler.scheduleAtFixedRate(
        this::processQueue,
        0,
        queueOptions.pollIntervalMinutes,
        TimeUnit.MINUTES
      );
      runningQueues.add(this);
      log.info(
        "Started processing queue {} every {} minutes",
        getQueueName(),
        queueOptions.pollIntervalMinutes
      );
    }
  }

  /**
   * Stops the processing of the queue. If the `force` parameter is true,
   * the method attempts to cancel the scheduled task forcefully and waits
   * for it to complete within a timeout period. If the task is successfully
   * stopped, the queue is removed from the list of running queues.
   *
   * @param force a Boolean indicating whether to forcefully stop the queue
   *              processing. If true, the task is canceled immediately and
   *              the method waits for its completion.
   * @return true if the queue processing was successfully stopped, false otherwise
   */
  @Override
  public Boolean stop(Boolean force) {
    if (scheduledFuture != null && (force || !scheduledFuture.isCancelled())) {
      scheduledFuture.cancel(force.equals(true));
      log.info("Stopped processing queue {}", getQueueName());
    }
    // If force is true then wait for the task to complete
    if (!scheduledFuture.isDone() && force) {
      try {
        scheduledFuture.wait(30000);
      } catch (InterruptedException e) {
        log.error(
          "Failed to stop processing queue {} within the timeout",
          getQueueName(),
          e
        );
      }
    }
    if (scheduledFuture.isDone()) {
      if (runningQueues.contains(this)) {
        runningQueues.remove(this);
      }
      scheduledFuture = null;
      return true;
    }
    return false;
  }

  /**
   * Checks if the broker-managed queue is currently running.
   *
   * @return {@code true} if the queue is running (i.e., the scheduled future is not null
   *         and has not been cancelled), {@code false} otherwise
   */
  @Override
  public Boolean getIsRunning() {
    return scheduledFuture != null && !scheduledFuture.isCancelled();
  }

  private Integer queueIdleIterationCount = 0;

  protected synchronized IQueueProcessor.QueueBatchContext<
    TQueueItem
  > getTransactionalBatch(RQueue<TQueueItem> queue) {
    if (queue.isEmpty()) {
      lastQueueSize.set(0);
      return new BrokerQueueBatchContext<TQueueItem>(queue, List.of());
    }
    int thisCurrentQueueSize = queue.size();
    int thisLastQueueSize = lastQueueSize.get();
    lastQueueSize.set(thisCurrentQueueSize);
    if (thisCurrentQueueSize < queueOptions.minItemsToProcess) {
      // Less than the minimum number of items to process - check to see if we are idle (eg no new items added since last check)
      if (thisLastQueueSize == thisCurrentQueueSize) {
        queueIdleIterationCount++;
        if (queueIdleIterationCount > 2) {
          // We'e waited around long enough, run any remaining items through the pipeline.
          log.info(
            "Queue {} has been idle for {} iterations, processing {} stragglers.",
            getQueueName(),
            queueIdleIterationCount + 1,
            thisCurrentQueueSize
          );
          // Note this is the one leaf in this branch where we don't return an empty list, but instead grab a batch of items.
        } else {
          log.trace(
            "Queue {} has been idle for {} iterations, giving straglers another {} cycles to find their way in.",
            getQueueName(),
            queueIdleIterationCount + 1,
            3 - queueIdleIterationCount
          );
          return new BrokerQueueBatchContext<TQueueItem>(queue, List.of());
        }
      } else {
        // Queue has changed since last check, reset the idle iteration count and wait for next processing cycle.
        queueIdleIterationCount = 0;
        log.trace(
          "Queue {} has changed by {} items since last check, resetting idle iteration count to 0.",
          getQueueName(),
          Math.abs(thisLastQueueSize - thisCurrentQueueSize)
        );
        return new BrokerQueueBatchContext<TQueueItem>(queue, List.of());
      }
    }
    // We have enough items to process, which inheritly means the number of items has changed since last check (or we would have processed them, duh)
    queueIdleIterationCount = 0;
    // If we made it this far we have enough items to process, so we can go ahead and grab a batch of items...
    List<TQueueItem> batch = null;
    try {
      batch = queue.poll(queueOptions.maxItemsToProcess);
      // Pop back onto the queue so we don't loose them in case of a processing error.
      queue.addAll(batch);
    } catch (Exception e) {
      if (batch != null && !batch.isEmpty()) {
        // This is no bueno - we took the items off and now can't put them back on.  Write them out to a file so we don't loose any data.
        var fileName = redis.writeToOfflineStorage(
          batch,
          getQueueName() + "_failed_" + e.getMessage()
        );
        log.error(
          String.format(
            "Error occurred re-adding batch to queue %s; Items have been saved to %s",
            getQueueName(),
            fileName
          ),
          e
        );
        throw new RuntimeException(
          String.format(
            "Error occurred re-adding batch to queue %s; Items have been saved to %s",
            getQueueName(),
            fileName
          ),
          e
        );
      } else {
        log.error(
          "An error occurred removing values from queue, no items were removed.",
          e
        );
        batch = List.of();
      }
    }
    return new BrokerQueueBatchContext<TQueueItem>(queue, batch);
  }

  /**
   * Processes a queue of items, handling them in batches. The method ensures that
   * only one instance of processing is active at a time. It retrieves items from
   * the queue, processes them, and handles errors gracefully by re-adding failed
   * items back to the queue.
   *
   * <p>Key Features:
   * <ul>
   *   <li>Prevents concurrent processing by using an `isProcessing` flag.</li>
   *   <li>Retrieves the queue using a Redis connection and processes items in batches.</li>
   *   <li>Supports optional writing of batch data to a file before processing.</li>
   *   <li>Handles processing failures by logging errors and re-adding items to the queue.</li>
   *   <li>Skips processing if the queue is disabled or if the queue name is not provided.</li>
   * </ul>
   *
   * <p>Behavior:
   * <ul>
   *   <li>If the queue size meets the minimum threshold or remains unchanged, items are processed.</li>
   *   <li>Logs detailed information about the processing status and errors.</li>
   *   <li>Ensures that the `isProcessing` flag is reset in the `finally` block to allow future runs.</li>
   * </ul>
   *
   * <p>Exceptions:
   * <ul>
   *   <li>Handles any exceptions during processing and logs them.</li>
   *   <li>Attempts to re-add items to the queue in case of errors, logging any failures during this step.</li>
   * </ul>
   *
   * <p>Note: This method assumes the existence of a Redis-backed queue and relies on
   * external configurations such as `queueOptions` and `redis`.
   */
  protected synchronized void processQueue() {
    RQueue<TQueueItem> queue = null;
    try {
      IRedisConnection redisConnection = redis == null
        ? RedisConnectionFactory.getInstance()
        : redis;
      var queueName = getQueueName();
      if (queueName == null) {
        return; // No queue name provided, nothing to process
      }
      queue = redisConnection.getRedisClient().getQueue(queueName);
      if (queue == null) {
        log.error("Queue {} not found", queueName);
        return; // Queue not found, nothing to process
      }
      var batch = getTransactionalBatch(queue);
      if (queueOptions.writeToFile) {
        flushBatchToFile(batch);
      }
      if (!queueOptions.isEnabled || !processor.getIsReady()) {
        log.trace(
          "Skipping processing for {} items from queue {} (disabled)",
          batch.size(),
          getQueueName()
        );
        return;
      }
      if (batch != null && !batch.isEmpty()) {
        processor.onBeginProcessing();
      }
      while (batch != null && !batch.isEmpty()) {
        if (isShuttingDown) {
          log.info("Shutting down queue {}", getQueueName());
          return;
        }
        var success = processBatch(batch);
        if (success.equals(Boolean.TRUE)) {
          // If setAbort was not called and items were not individually completed, complete the batch
          if (!batch.isAborted() && !batch.anyCompleted()) {
            queue.removeAll(batch);
          }
        } else {
          log.error(
            "Failed to process batch of {} items from queue {} - processBatch returned false.",
            batch.size(),
            getQueueName()
          );
          return;
        }
        batch = getTransactionalBatch(queue);
      }
    } catch (Exception e) {
      log.error(
        "An error occurred while processing the queue {}",
        getQueueName(),
        e
      );
    }
  }

  /**
   * Writes a batch of items to a file.
   *
   * @param batch the batch of items to write to the file
   */
  protected void flushBatchToFile(List<TQueueItem> batch) {
    try {
      String queueName = getQueueName().toLowerCase();
      String filePath =
        "C:\\Users\\seanm\\source\\repos\\work\\queue_" + queueName + ".json";
      java.nio.file.Path path = java.nio.file.Paths.get(filePath);
      java.nio.file.Files.createDirectories(path.getParent());
      Strings.writeObjectToFile(batch, filePath);
    } catch (Exception e) {
      log.error("Failed to write batch to file: {}", e.getMessage(), e); // Log the exception
    }
  }

  /**
   * Processes a batch of items using the queue processor.
   *
   * @param batch the batch of items to process
   * @return true if the batch was successfully processed, false otherwise
   */
  protected Boolean processBatch(
    IQueueProcessor.QueueBatchContext<TQueueItem> batch
  ) {
    try {
      return processor.processBatch(batch);
    } catch (Exception e) {
      Log.error(
        "An error occurred while processing a batch on queue {}",
        getQueueName(),
        e
      );
      batch.setAbort();
      return false;
    }
  }

  static <TQueueItem> IQueueProcessor.QueueBatchContext<
    TQueueItem
  > batchContext(RQueue<TQueueItem> queue, List<TQueueItem> items) {
    return new BrokerQueueBatchContext<TQueueItem>(queue, items);
  }

  static class BrokerQueueBatchContext<TQueueItem>
    extends WrappedList<TQueueItem>
    implements IQueueProcessor.QueueBatchContext<TQueueItem> {

    private final BrokerQueueBatchContext<TQueueItem> parent;
    private final RQueue<TQueueItem> queue;
    private Boolean isAborted = false;
    private Boolean isCompleted = false;

    public BrokerQueueBatchContext(
      RQueue<TQueueItem> queue,
      List<TQueueItem> items
    ) {
      super(items);
      this.queue = queue;
      this.parent = null;
    }

    public BrokerQueueBatchContext(
      BrokerQueueBatchContext<TQueueItem> parent,
      List<TQueueItem> items
    ) {
      super(items);
      this.isAborted = parent.isAborted;
      this.isCompleted = parent.isCompleted;
      this.queue = parent.queue;
      this.parent = parent;
    }

    @Override
    public IQueueProcessor.QueueBatchContext<TQueueItem> makeBatch(
      Integer batchStart,
      Integer batchSize
    ) {
      return new BrokerQueueBatchContext<TQueueItem>(
        this,
        this.subList(batchStart, batchStart + batchSize)
      );
    }

    @Override
    public void setComplete(TQueueItem model) {
      isCompleted = true;
      if (parent == null) {
        queue.remove(model);
      } else {
        parent.setComplete(model);
      }
    }

    @Override
    public void setAbort() {
      isAborted = true;
      if (parent != null) {
        parent.setAbort();
      }
    }

    @Override
    public Boolean isAborted() {
      return isAborted;
    }

    @Override
    public Boolean anyCompleted() {
      return isCompleted;
    }

    @Override
    public Boolean replace(TQueueItem oldModel, TQueueItem newModel) {
      Boolean ret;
      if (parent == null) {
        ret = queue.remove(oldModel);
        remove(oldModel);
        queue.add(newModel);
      } else {
        ret = parent.replace(oldModel, newModel);
      }
      if (ret.equals(Boolean.TRUE)) {
        add(newModel);
      }
      return ret;
    }

    @Override
    public Boolean replace(
      List<TQueueItem> oldModels,
      List<TQueueItem> newModels
    ) {
      Boolean ret;
      if (parent == null) {
        ret = queue.removeAll(oldModels);
        removeAll(oldModels);
        queue.addAll(newModels);
      } else {
        ret = parent.replace(oldModels, newModels);
      }
      addAll(newModels);
      return ret;
    }

    @Override
    public Boolean replace(List<TQueueItem> newModels) {
      Boolean ret;
      if (parent == null) {
        ret = queue.removeAll(this);
        queue.addAll(newModels);
      } else {
        ret = parent.replace(this, newModels);
      }
      clear();
      addAll(newModels);
      return ret;
    }
  }
}
