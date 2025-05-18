package com.obapps.schoolchatbot.chat;

import com.obapps.core.exceptions.ErrorUtil;
import com.obapps.core.redis.RedisConnectionFactory;
import com.obapps.core.util.*;
import com.obapps.schoolchatbot.chat.assistants.*;
import com.obapps.schoolchatbot.chat.assistants.services.ai.chat.ToolAwareAssistant;
import com.obapps.schoolchatbot.chat.assistants.services.ai.phases.IBrokerManagedQueue;
import com.obapps.schoolchatbot.chat.assistants.services.ai.phases.two.BrokerManagedQueue;
import com.obapps.schoolchatbot.chat.assistants.services.ai.phases.two.CtaCategoryQueueProcessor;
import com.obapps.schoolchatbot.chat.assistants.services.ai.phases.two.CtaTitleIXAccessAssesmentQueueProcessor;
import com.obapps.schoolchatbot.chat.assistants.services.ai.phases.two.ResponsiveActionAssignmentQueueProcessor;
import com.obapps.schoolchatbot.chat.services.RedisClient;
import com.obapps.schoolchatbot.core.assistants.services.*;
import com.obapps.schoolchatbot.core.models.EmbedPolicyFolderOptions;
import com.obapps.schoolchatbot.embed.EmbedDocuments;
import com.obapps.schoolchatbot.embed.EmbedFeds;
import com.obapps.schoolchatbot.embed.EmbedMnLaw;
import com.obapps.schoolchatbot.embed.EmbedPlsas;
import com.obapps.schoolchatbot.embed.FileSystemEmbedder;
import dev.langchain4j.model.azure.AzureOpenAiChatModel;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Scanner;

/**
 * The main entry point for the SchoolChatBot application.
 * This class initializes and starts the chatbot application.
 *
 * <p>Key Features:</p>
 * <ul>
 *   <li>Provides a singleton instance of the chatbot.</li>
 *   <li>Initializes the application with a shared {@link Scanner} instance.</li>
 *   <li>Includes utility methods for accessing AI models and configurations.</li>
 * </ul>
 *
 * <p>Example usage:</p>
 * <pre>
 * {@code
 * SchoolChatBot bot = SchoolChatBot.getInstance();
 * bot.start();
 * }
 * </pre>
 *
 * <p>Thread Safety:</p>
 * <p>This class is thread-safe as it uses a synchronized singleton pattern for initialization.</p>
 */
public class SchoolChatBot implements AutoCloseable {

  private static SchoolChatBot globalInstance;

  public static SchoolChatBot getInstance() {
    return globalInstance;
  }

  /**
   * Helper shortcut to get {@link getCompletionsModel}, used for completions.
   * @return An instance of {@code AzureOpenAiChatModel} configured with the
   *         necessary API key, endpoint, deployment name, and logging settings.
   */
  public static AzureOpenAiChatModel completions() {
    return getInstance().getCompletionsModel();
  }

  private AzureOpenAiChatModel completionsModel;
  /**
   * A Scanner instance used for reading input within the application.
   * This is a final field, ensuring that the reference to the Scanner
   * cannot be changed after initialization.
   */
  private final Scanner appScanner;
  private final RedisClient redisClient;

  /**
   * Constructs a new instance of the SchoolChatBot class.
   *
   * @param scanner the Scanner object used for reading user input
   */
  private SchoolChatBot(Scanner scanner) {
    this.appScanner = scanner;
    this.redisClient = RedisClient.getInstance();
    initializeRedisConnection();
  }

  private List<IBrokerManagedQueue> queues = new ArrayList<>();

  private void initializeRedisConnection() {
    RedisConnectionFactory.setGlobalInstance(this.redisClient);
    queues.add(
      new BrokerManagedQueue<>(
        new CtaCategoryQueueProcessor(),
        redisClient,
        null
      )
    );

    queues.add(
      new BrokerManagedQueue<>(
        new CtaTitleIXAccessAssesmentQueueProcessor(),
        redisClient,
        BrokerManagedQueue.Options.builder()
          .setMaxItemsToProcess(40)
          .setMinItemsToProcess(10)
          .build()
      )
    );

    queues.forEach(queue -> {
      try {
        queue.start();
      } catch (Exception e) {
        System.out.println("Error starting queue: " + e.getMessage());
      }
    });
  }

  /**
   * Retrieves the Azure OpenAI Chat Model for generating completions.
   * If the model has not been initialized, it creates a new instance using
   * configuration values from environment variables.
   *
   * @return An instance of {@code AzureOpenAiChatModel} configured with the
   *         necessary API key, endpoint, deployment name, and logging settings.
   */
  public AzureOpenAiChatModel getCompletionsModel() {
    if (completionsModel == null) {
      var openAiVars = EnvVars.getInstance().getOpenAi();
      completionsModel = AzureOpenAiChatModel.builder()
        .apiKey(openAiVars.getSearchApiKeyCompletions())
        .endpoint(openAiVars.getApiEndpointCompletions())
        .deploymentName(openAiVars.getDeploymentCompletions())
        .logRequestsAndResponses(true)
        .build();
    }
    return completionsModel;
  }

  /**
   * Retrieves the shared Scanner instance used by the application.
   *
   * @return the Scanner instance for reading user input.
   */
  public Scanner getScanner() {
    return appScanner;
  }

  /**
   * Runs the main loop of the School Chat Bot application.
   * Displays a menu to the user with options to analyze text for key points,
   * analyze for calls to action, or exit the application.
   *
   * @param args Command-line arguments passed to the application.
   *
   * The method performs the following steps:
   * 1. Displays a welcome message and menu options.
   * 2. Reads the user's choice and validates the input.
   * 3. Executes the corresponding functionality based on the user's choice:
   *    - Option 1: Invokes the KeyPointAnalysis module.
   *    - Option 2: Invokes the CallToActionAnalysis module.
   *    - Option 3: Processes documents for Stage 1.
   *    - Option 4: Processes documents for Stage 2.
   *    - Option 5: Exits the application.
   * 4. Handles invalid input and prompts the user to try again.
   */
  protected void run(String[] args) {
    Boolean isDone = false;

    while (!isDone) {
      if (EnvVars.getInstance().getDb().getUrl().indexOf("prod") > 0) {
        Colors.writeInLivingColor(
          c -> c.RED,
          "Running in production mode. Please be careful with your actions.\n"
        );
      } else {
        Colors.writeInLivingColor(
          c -> c.YELLOW,
          "Running in development mode.\n"
        );
      }
      System.out.println("Welcome to the School Chat Bot!");
      System.out.println("Please select an option:");
      System.out.println("1. Chat with tool support");
      System.out.println("2. Analyze for Key Points");
      System.out.println("3. Analyze for Calls to Action");
      System.out.println("4. Process Documents for Stage 1");
      System.out.println("5. Process Documents for Stage 2");
      System.out.println("6. Embed pending documents");
      System.out.println("7. Process Responsive Actions");
      System.out.println("8. Exit");
      int choice;
      try {
        choice = Integer.parseInt(appScanner.nextLine());
      } catch (NumberFormatException e) {
        System.out.println("Invalid input. Please enter a number.");
        continue;
      }
      switch (choice) {
        case 1:
          try {
            var chatAssistant = new ToolAwareAssistant(
              ToolAwareAssistant.options(appScanner).setLogToFile(
                "chat-log.txt"
              )
            );
            chatAssistant.chat();
          } catch (Exception e) {
            Colors.writeInLivingColor(
              c -> c.RED,
              "Error during chat: %s",
              e.getMessage()
            );
            ErrorUtil.handleException(e);
            continue;
          }
          break;
        case 2:
          try {
            choice = Integer.parseInt(appScanner.nextLine());
            var stage1 = new AnalysisStageManager(
              2,
              Db.getInstance(),
              new StageAnalystFactory()
            );
            stage1.processDocument(choice);
          } catch (SQLException e) {
            System.out.println("Error processing document: " + e.getMessage());
            continue;
          }
          break;
        case 3:
          CallToActionAnalysis.run(appScanner, args);
          break;
        case 4:
          try {
            var stage1 = new AnalysisStageManager(
              1,
              Db.getInstance(),
              new StageAnalystFactory()
            );
            stage1.processDocuments();
          } catch (SQLException e) {
            System.out.println("Error processing documents: " + e.getMessage());
          }
          break;
        case 5:
          try {
            var stage2 = new AnalysisStageManager(
              2,
              Db.getInstance(),
              new StageAnalystFactory()
            );
            stage2.processDocuments();
          } catch (SQLException e) {
            System.out.println("Error processing documents: " + e.getMessage());
          }
          break;
        case 6:
          embedDocuments();
          break;
        case 7:
          if (queues.size() < 3) {
            var q = new BrokerManagedQueue<>(
              new ResponsiveActionAssignmentQueueProcessor(),
              redisClient,
              BrokerManagedQueue.Options.builder()
                .setMaxItemsToProcess(1)
                .setMinItemsToProcess(1)
                .setPollIntervalMinutes(1)
                .build()
            );
            queues.add(q);
            q.start();
          }
          break;
        case 8:
          System.out.println("Exiting the application. Goodbye!");
          isDone = true;
          break;
        default:
          System.out.println("Invalid choice. Please try again.");
      }
    }
  }

  protected void embedDocuments() {
    try {
      System.out.println("Embed documents of type:");
      System.out.println("1. PLSAS Policy");
      System.out.println("2. MN State");
      System.out.println("3. Federal Law");
      System.out.println("4. Case Documents");
      System.out.println("5. Cancel");
      FileSystemEmbedder embedder = null;
      String BASE_FOLDER = "C:\\Users\\seanm\\OneDrive\\PLSASComplaint\\";
      try {
        int typeChoice = Integer.parseInt(appScanner.nextLine());
        switch (typeChoice) {
          case 1:
            embedder = new EmbedPlsas(
              new EmbedPolicyFolderOptions()
                .setSourceFolder(BASE_FOLDER + "PLSAS Policy")
            );
            break;
          case 2:
            embedder = new EmbedMnLaw(
              new EmbedPolicyFolderOptions()
                .setSourceFolder(BASE_FOLDER + "MNLaw")
            );
            break;
          case 3:
            embedder = new EmbedFeds(
              new EmbedPolicyFolderOptions()
                .setSourceFolder(BASE_FOLDER + "FedLaw")
            );
            break;
          case 4:
            EmbedDocuments.main(null);
            break;
          case 5:
            System.out.println("Operation cancelled.");
            break;
          default:
            System.out.println("Invalid choice. Please try again.");
            break;
        }
      } catch (NumberFormatException e) {
        System.out.println("Invalid input. Please enter a number.");
      }
      if (embedder != null) {
        try (var e = embedder) {
          e.run();
        }
      }
    } catch (Exception e) {
      System.out.println("Error embedding documents: " + e.getMessage());
    }
  }

  /**
   * The main method to launch the SchoolChatBot application.
   *
   * @param args Command-line arguments passed to the application.
   */
  public static void main(String[] args) {
    try (Scanner scanner = new Scanner(System.in)) {
      var scb = new SchoolChatBot(scanner);
      SchoolChatBot.globalInstance = scb;
      try (scb) {
        SchoolChatBot.globalInstance.run(args);
      }
    } catch (Exception e) {
      System.out.println("Error: " + e.getMessage());
    }
  }

  @Override
  public void close() throws Exception {
    EmbedDocuments.cancel(true);
    BrokerManagedQueue.shutdownAllQueues();
    redisClient.close();
    redisClient.stop(true);
  }
}
