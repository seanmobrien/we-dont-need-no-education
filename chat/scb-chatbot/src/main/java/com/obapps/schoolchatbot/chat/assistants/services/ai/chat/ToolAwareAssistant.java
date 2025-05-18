package com.obapps.schoolchatbot.chat.assistants.services.ai.chat;

import com.obapps.core.ai.factory.models.AiServiceOptions;
import com.obapps.core.ai.factory.models.ModelType;
import com.obapps.core.ai.factory.services.StandaloneModelClientFactory;
import com.obapps.core.ai.factory.types.ILanguageModelFactory;
import com.obapps.core.util.Colors;
import com.obapps.core.util.DateTimeFormats;
import com.obapps.schoolchatbot.chat.assistants.Prompts;
import com.obapps.schoolchatbot.chat.assistants.tools.AddKeyPointsTool;
import com.obapps.schoolchatbot.core.services.ai.IAiChatAssistant;
import dev.langchain4j.memory.ChatMemory;
import dev.langchain4j.memory.chat.MessageWindowChatMemory;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.Scanner;

public class ToolAwareAssistant {

  public static Options options(Scanner scanner) {
    return new Options(scanner);
  }

  public static class Options {

    private final Scanner scanner;
    private ILanguageModelFactory modelFactory;
    private IAiChatAssistant assistant;
    private String logToFile = null;
    private ChatMemory memory;

    public String getLogToFile() {
      return logToFile;
    }

    public Options setLogToFile(String logToFile) {
      this.logToFile = logToFile;
      return this;
    }

    public Options(Scanner scanner) {
      this.scanner = scanner;
    }

    public ILanguageModelFactory getModelFactory() {
      return modelFactory;
    }

    public Options setChatMemory(ChatMemory memory) {
      this.memory = memory;
      return this;
    }

    public ChatMemory getChatMemory() {
      return memory;
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

    private IAiChatAssistant createAssistant(
      ILanguageModelFactory modelFactory
    ) {
      if (modelFactory == null) {
        modelFactory = new StandaloneModelClientFactory();
      }
      if (this.memory == null) {
        this.memory = MessageWindowChatMemory.withMaxMessages(100);
      }

      return modelFactory.createService(
        AiServiceOptions.builder(IAiChatAssistant.class)
          .onSetupModel(model -> model.user("Sean"))
          .setMemoryWindow(0)
          .setModelType(ModelType.HiFi)
          .onSetupService(svc ->
            svc
              .tools(new AddKeyPointsTool(null))
              .systemMessageProvider(c -> Prompts.GetSystemMessageForPhase(-1))
              .chatMemory(memory)
          )
          .build()
      );
    }
  }

  private final IAiChatAssistant assistant;
  private final Scanner scanner;
  private String logFile;
  private final ChatMemory memory;

  public ToolAwareAssistant() {
    this(null);
  }

  public ToolAwareAssistant(Options options) {
    if (options == null) {
      options = new Options(new Scanner(System.in));
    }
    this.scanner = options.getScanner();
    this.assistant = options.getAssistant();
    this.logFile = options.getLogToFile();
    this.memory = options.getChatMemory();
  }

  public IAiChatAssistant getAssistant() {
    return assistant;
  }

  protected void writeToFile(String message, Boolean isUser) {
    if (this.logFile == null) {
      return;
    }
    try {
      Path path = Paths.get(this.logFile);
      Files.writeString(
        path,
        String.format(
          "[%s] %s:\n%s\n",
          DateTimeFormats.localTime.format(LocalDateTime.now()),
          isUser ? "User" : "Assistant",
          message
        ),
        java.nio.file.StandardOpenOption.CREATE,
        java.nio.file.StandardOpenOption.APPEND
      );
    } catch (IOException ex) {
      Colors.writeInLivingColor(
        c -> c.RED,
        "Error writing to log file: %s\n",
        ex.getMessage()
      );
    }
  }

  public void chat() {
    var welcomeMessage = new StringBuilder();
    if (this.logFile != null) {
      welcomeMessage.append(
        "\"Commands:\n\t'exit': exit the chat\n\t'clear': clear chat history\n\tEmpty line: send query\n"
      );
      try {
        Path path = Paths.get(this.logFile).toAbsolutePath();
        Files.createDirectories(path.getParent());
        welcomeMessage
          .append("Conversation will be logged to:\n\t[")
          .append(path.toAbsolutePath())
          .append("]\n");
      } catch (IOException ex) {
        Colors.writeInLivingColor(
          c -> c.RED,
          "Error creating log file: %s\n",
          ex.getMessage()
        );
        this.logFile = null;
      }
    }

    welcomeMessage.append("\nHello!  How can I help you today?\n");
    Colors.writeInLivingColor(c -> c.GREEN, welcomeMessage.toString());

    while (true) {
      Colors.Set(c -> c.YELLOW);
      String userInput = "";
      while (true) {
        String thisLine = null;
        try {
          thisLine = Objects.requireNonNullElse(scanner.nextLine(), "").trim();
        } catch (Exception e) {
          Colors.writeInLivingColor(
            c -> c.RED,
            "Error reading input: %s\n\n",
            e.getMessage()
          );
          System.out.println("Error reading input: " + e.getMessage());
          thisLine = null;
        }
        if (thisLine.length() == 0) {
          break;
        }
        if (thisLine.equalsIgnoreCase("exit")) {
          userInput = "exit";
          break;
        }
        userInput += thisLine + "\n";
      }
      Colors.Reset();
      if (userInput.equalsIgnoreCase("exit")) {
        break;
      }
      if (userInput.equalsIgnoreCase("clear")) {
        this.memory.clear();
        Colors.writeInLivingColor(c -> c.GREEN, "Chat history cleared.\n");
        continue;
      }
      writeToFile(userInput, true);
      var response = assistant.answer(userInput);
      Colors.writeInLivingColor(
        c -> c.BRIGHT + c.BLUE,
        "Assistant:\n\tInput Tokens: %s\n\tOutput Tokens: %s\n\tTool Calls: %s\n",
        response.tokenUsage().inputTokenCount(),
        response.tokenUsage().outputTokenCount(),
        response.toolExecutions().size()
      );
      writeToFile(response.content(), false);
      Colors.writeInLivingColor(c -> c.BLUE, "Response: ");
      Colors.writeInLivingColor(c -> c.CYAN, "%s\n\n", response.content());
      Colors.writeInLivingColor(c -> c.GREEN, "Query ('exit' to quit):\n");
    }
  }
}
