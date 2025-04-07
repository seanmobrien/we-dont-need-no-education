package com.obapps.schoolchatbot;

import com.obapps.schoolchatbot.assistants.CallToActionAnalysis;
import com.obapps.schoolchatbot.assistants.KeyPointAnalysis;
import com.obapps.schoolchatbot.util.EnvVars;
import dev.langchain4j.model.azure.AzureOpenAiChatModel;
import java.util.Scanner;

/**
 * The {@code SchoolChatBot} class provides a command-line interface for interacting
 * with a chatbot designed for educational purposes. It allows users to analyze
 * text for key points or calls to action using Azure OpenAI services. The class
 * manages the lifecycle of the chatbot, including initialization, user interaction,
 * and cleanup.
 *
 * <p>Features:
 * <ul>
 *   <li>Singleton pattern to ensure a single instance of the chatbot.</li>
 *   <li>Integration with Azure OpenAI for text analysis.</li>
 *   <li>Command-line interface for user interaction.</li>
 * </ul>
 *
 * <p>Usage:
 * <pre>{@code
 * public static void main(String[] args) {
 *     SchoolChatBot.main(args);
 * }
 * }</pre>
 *
 * <p>Dependencies:
 * <ul>
 *   <li>{@code AzureOpenAiChatModel} for OpenAI integration.</li>
 *   <li>{@code EnvVars} for environment variable configuration.</li>
 *   <li>{@code Scanner} for reading user input.</li>
 *   <li>{@code KeyPointAnalysis} and {@code CallToActionAnalysis} for text analysis.</li>
 * </ul>
 *
 * <p>Example Interaction:
 * <pre>
 * Welcome to the School Chat Bot!
 * Please select an option:
 * 1. Analyze for Key Points
 * 2. Analyze for Calls to Action
 * 3. Exit
 * </pre>
 *
 * @see AzureOpenAiChatModel
 * @see EnvVars
 * @see KeyPointAnalysis
 * @see CallToActionAnalysis
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
      System.out.println("3. Exit");
      int choice;
      try {
        choice = Integer.parseInt(appScanner.nextLine());
      } catch (NumberFormatException e) {
        System.out.println("Invalid input. Please enter a number.");
        continue;
      }
      switch (choice) {
        case 1:
          KeyPointAnalysis.run(appScanner, args);
          break;
        case 2:
          CallToActionAnalysis.run(appScanner, args);
          break;
        case 3:
          isDone = true;
          break;
        default:
          System.out.println("Invalid choice. Please try again.");
      }
    }
  }

  /**
   * The main entry point for the School Chat Bot application.
   * This method provides a command-line interface for users to interact with the bot.
   * Users can choose to analyze key points or calls to action in their messages.
   *
   * @param args Command-line arguments (not used).
   */
  public static void main(String[] args) {
    try (Scanner scanner = new Scanner(System.in)) {
      SchoolChatBot.globalInstance = new SchoolChatBot(scanner);
      SchoolChatBot.globalInstance.run(args);
      System.out.println("Thank you for using the School Chat Bot. Goodbye!");
    }
  }

  public static String hello() {
    return "world!";
  }
}
