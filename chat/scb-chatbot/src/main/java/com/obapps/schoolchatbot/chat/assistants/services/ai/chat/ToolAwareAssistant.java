package com.obapps.schoolchatbot.chat.assistants.services.ai.chat;

import com.obapps.core.ai.factory.models.AiServiceOptions;
import com.obapps.core.ai.factory.models.ModelType;
import com.obapps.core.ai.factory.services.StandaloneModelClientFactory;
import com.obapps.core.ai.factory.types.ILanguageModelFactory;
import com.obapps.core.util.Colors;
import com.obapps.schoolchatbot.chat.assistants.Prompts;
import com.obapps.schoolchatbot.chat.assistants.tools.AddKeyPointsTool;
import com.obapps.schoolchatbot.core.services.ai.IAiChatAssistant;
import java.util.Scanner;

public class ToolAwareAssistant {

  public static Options options(Scanner scanner) {
    return new Options(scanner);
  }

  public static class Options {

    private final Scanner scanner;
    private ILanguageModelFactory modelFactory;
    private IAiChatAssistant assistant;

    public Options(Scanner scanner) {
      this.scanner = scanner;
    }

    public ILanguageModelFactory getModelFactory() {
      return modelFactory;
    }

    public Options setModelFactory(ILanguageModelFactory modelFactory) {
      this.modelFactory = modelFactory;
      return this;
    }

    public IAiChatAssistant getAssistant() {
      return assistant == null ? createAssistant(modelFactory) : assistant;
    }

    public Options setAssistant(IAiChatAssistant assistant) {
      this.assistant = assistant;
      return this;
    }

    public Scanner getScanner() {
      return scanner;
    }

    private static IAiChatAssistant createAssistant(
      ILanguageModelFactory modelFactory
    ) {
      if (modelFactory == null) {
        modelFactory = new StandaloneModelClientFactory();
      }

      return modelFactory.createService(
        AiServiceOptions.builder(IAiChatAssistant.class)
          .onSetupModel(model -> model.user("Parent of former District student")
          )
          .setMemoryWindow(100)
          .setModelType(ModelType.HiFi)
          .onSetupService(svc ->
            svc
              .tools(new AddKeyPointsTool(null))
              .systemMessageProvider(c -> Prompts.GetSystemMessageForPhase(-1))
          )
          .build()
      );
    }
  }

  private final IAiChatAssistant assistant;
  private final Scanner scanner;

  public ToolAwareAssistant() {
    this(null);
  }

  public ToolAwareAssistant(Options options) {
    if (options == null) {
      options = new Options(new Scanner(System.in));
    }
    this.scanner = options.getScanner();
    this.assistant = options.getAssistant();
  }

  public IAiChatAssistant getAssistant() {
    return assistant;
  }

  public void chat() {
    System.out.println(
      "Hello!  How can I help you today? (type 'exit' to quit):"
    );
    while (true) {
      Colors.writeInLivingColor(c -> c.GREEN, "Query ('exit' to quit): ");
      Colors.Set(c -> c.YELLOW);
      String userInput = null;
      try {
        userInput = scanner.nextLine();
      } catch (Exception e) {
        Colors.writeInLivingColor(
          c -> c.RED,
          "Error reading input: %s\n\n",
          e.getMessage()
        );
        System.out.println("Error reading input: " + e.getMessage());
        userInput = null;
      }
      Colors.Reset();
      if (userInput == null) {
        continue;
      }
      if (userInput.equalsIgnoreCase("exit")) {
        break;
      }
      var response = assistant.answer(userInput);
      Colors.writeInLivingColor(
        c -> c.BRIGHT + c.BLUE,
        "Assistant:\n\tInput Tokens: %s\n\tOutput Tokens: %s\n\tTool Calls: %s\n",
        response.tokenUsage().inputTokenCount(),
        response.tokenUsage().outputTokenCount(),
        response.toolExecutions().size()
      );
      Colors.writeInLivingColor(c -> c.BLUE, "Response: ");
      Colors.writeInLivingColor(c -> c.CYAN, "%s\n\n", response.content());
    }
  }
}
