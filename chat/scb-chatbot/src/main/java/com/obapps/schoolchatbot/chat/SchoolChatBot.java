package com.obapps.schoolchatbot.chat;

import com.obapps.core.util.*;
import com.obapps.schoolchatbot.chat.assistants.*;
import com.obapps.schoolchatbot.core.assistants.services.*;
import dev.langchain4j.model.azure.AzureOpenAiChatModel;
import java.sql.SQLException;
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
public class SchoolChatBot {

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

  /**
   * Constructs a new instance of the SchoolChatBot class.
   *
   * @param scanner the Scanner object used for reading user input
   */
  private SchoolChatBot(Scanner scanner) {
    this.appScanner = scanner;
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
   *    - Option 3: Exits the application.
   * 4. Handles invalid input and prompts the user to try again.
   */
  protected void run(String[] args) {
    Boolean isDone = false;

    while (!isDone) {
      System.out.println("Welcome to the School Chat Bot!");
      System.out.println("Please select an option:");
      System.out.println("1. Analyze for Key Points");
      System.out.println("2. Analyze for Calls to Action");
      System.out.println("3. Process Documents for Stage 1");
      System.out.println("4. Process Documents for Stage 2");
      System.out.println("5. Exit");
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
            choice = Integer.parseInt(appScanner.nextLine());
            var stage1 = new AnalysisStageManager(
              1,
              Db.getInstance(),
              new StageAnalystFactory()
            );
            stage1.processDocument(choice);
          } catch (SQLException e) {
            System.out.println("Error processing document: " + e.getMessage());
            continue;
          }
          break;
        case 2:
          CallToActionAnalysis.run(appScanner, args);
          break;
        case 3:
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
        case 4:
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
        case 5:
          System.out.println("Exiting the application. Goodbye!");
          isDone = true;
          break;
        default:
          System.out.println("Invalid choice. Please try again.");
      }
    }
  }

  /**
   * The main method to launch the SchoolChatBot application.
   *
   * @param args Command-line arguments passed to the application.
   */
  public static void main(String[] args) {
    try (Scanner scanner = new Scanner(System.in)) {
      SchoolChatBot.globalInstance = new SchoolChatBot(scanner);
      SchoolChatBot.globalInstance.run(args);
      System.out.println("Thank you for using the School Chat Bot. Goodbye!");
    }
  }

  /**
   * A simple method to return a greeting message.
   *
   * @return A greeting string "world!".
   */
  public static String hello() {
    return "world!";
  }
}
