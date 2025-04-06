package com.obapps.schoolchatbot.assistants;

import com.obapps.schoolchatbot.assistants.retrievers.*;
import com.obapps.schoolchatbot.assistants.tools.*;
import com.obapps.schoolchatbot.data.*;
import com.obapps.schoolchatbot.util.Strings;
import dev.langchain4j.data.message.TextContent;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.memory.ChatMemory;
import dev.langchain4j.rag.DefaultRetrievalAugmentor.DefaultRetrievalAugmentorBuilder;
import dev.langchain4j.rag.RetrievalAugmentor;
import dev.langchain4j.rag.content.retriever.ContentRetriever;
import dev.langchain4j.service.AiServices;
import java.util.Scanner;

public class KeyPointAnalysis extends DocumentChatAssistant {

  public KeyPointAnalysis() {
    super(new AssistantProps(1));
  }

  public KeyPointAnalysis(String initialRequest) {
    super(new AssistantProps(1).setInitialRequest(initialRequest));
  }

  public void talkWith(Scanner scanner) {
    super.startConversationWith(scanner);
  }

  private Integer detectedPoints = 0;
  private Integer autoResponseCount = 0;

  @Override
  public UserMessage generatePrompt(UserMessage userMessage) {
    try {
      var promptBuilder = new StringBuilder();
      promptBuilder.append(Prompts.getPromptForPhase(this.getPhase()));

      detectedPoints = Content.KeyPoints.size();
      if (detectedPoints > 0) {
        promptBuilder
          .append("You have already identified the following Key Points:\n")
          .append(
            Strings.getRecordOutput(
              "Key Points",
              Content.toJsonArray(Content.KeyPoints)
            )
          );
      } else {
        promptBuilder.append("You have not yet identified any Key Points.\n");
      }
      promptBuilder.append("\n");
      promptBuilder.append(Content.getActiveDocumentContent().getPromptText());
      promptBuilder.append("\n\n");

      Colors.Reset();
      return UserMessage.builder()
        .addContent(new TextContent(promptBuilder.toString()))
        .build();
    } catch (IllegalArgumentException ex) {
      Colors.Set(c -> c.RED + c.BRIGHT);
      log.error("Key Point Content Injection: " + ex.getMessage(), ex);
      Colors.Reset();
      return UserMessage.builder().addContent(new TextContent("PING")).build();
    }
  }

  @Override
  protected DefaultRetrievalAugmentorBuilder prepareRetrievalAugmentor(
    DefaultRetrievalAugmentorBuilder builder,
    ContentRetriever... additionalRetrievers
  ) {
    return super.prepareRetrievalAugmentor(
      builder,
      new KeyPointsRetriever()
    ).contentInjector(this);
  }

  AddKeyPointsTool tool;

  @Override
  protected <T> AiServices<T> prepareAssistantService(
    AiServices<T> builder,
    RetrievalAugmentor retrievalAugmentor,
    ChatMemory chatMemory
  ) {
    tool = new AddKeyPointsTool(this);
    // No chat memory saves on context space
    return super.prepareAssistantService(
      builder,
      retrievalAugmentor,
      null
    ).tools(tool);
  }

  @Override
  protected String onAssistantResponse(
    String response,
    String lastUserMessage
  ) {
    Colors.Set(c -> c.YELLOW + c.BRIGHT);
    log.info(
      "Auto Response Count: " +
      autoResponseCount +
      ", Detected Points: " +
      detectedPoints
    );
    Colors.Reset();
    return "exit";
  }

  String lastAutoMessage = null;
  String _lastKeyPoint;

  public static void run(Scanner scanner, String[] args) {
    KeyPointAnalysis emailSummarizer = new KeyPointAnalysis();
    if (args.length > 0) {
      try {
        if (Integer.parseInt(args[0]) > 0) {
          emailSummarizer.setAutoResponse(args[0]);
        }
      } catch (IllegalArgumentException ex) {
        // Not an int
      }
    }
    emailSummarizer.talkWith(scanner);
  }
}
