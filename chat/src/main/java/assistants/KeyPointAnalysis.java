package assistants;

import data.Colors;
import data.PolicyTypeConstants;
import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import dev.langchain4j.data.message.TextContent;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.memory.ChatMemory;
import dev.langchain4j.rag.DefaultRetrievalAugmentor.DefaultRetrievalAugmentorBuilder;
import dev.langchain4j.rag.RetrievalAugmentor;
import dev.langchain4j.rag.content.Content;
import dev.langchain4j.rag.content.injector.ContentInjector;
import dev.langchain4j.rag.content.retriever.azure.search.AzureAiSearchContentRetriever;
import dev.langchain4j.service.AiServices;
import java.sql.SQLException;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import util.Db;

public class KeyPointAnalysis extends ChatAssistant implements ContentInjector {

  public void talkWith() {
    super.startConversationWith();
  }

  private Integer detectedPoints = 0;
  private Integer autoResponseCount = 0;
  private Integer documentId = null;
  private UUID emailMessageId = null;
  private String documentType = "email";

  @Override
  public UserMessage inject(List<Content> contents, UserMessage userMessage) {
    try {
      final String emailMessageInput = lookupDocumentText(
        userMessage.singleText()
      );

      StringBuilder contentBuilder = new StringBuilder(
        //"Analyze the following email message.  Enumerate as many Key Points as possible contained that are relevant to school obligation under policy, state, or federal law.\n"
        //"Add all detected Key Points to the database.  A Key Point is anything relevant to a school obligation under board policy, or Minnesota / Federal law.  We get paid per identified item, so make sure to be thorough.  Double-check to make sure you get them all."
        "Analyze the following email message.  Enumerate as many Key Points as possible that are relevant to school obligation under policy, state, or federal law.  Add them all to our database."
      );
      contentBuilder.append(
        "Include these policy search results as a factor in your analysis:\n"
      );
      if (contents != null && !contents.isEmpty()) {
        contents.forEach(content -> {
          contentBuilder.append(
            "BEGIN POLICY HIT\n" +
            summarizePolicyMatch(content, emailMessageInput) +
            "\nEND POLICY HIT\n"
          );
        });
      }

      contentBuilder
        .append("\nBEGIN email message:\n")
        .append(emailMessageInput)
        .append("END email message");

      Colors.Set(c -> c.GREEN + c.BRIGHT);
      log.info(
        String.format(
          "Key Point Content Injection:\n\tDocument Id: %d\n\tDocument Type: %s\n\tEmail Id%s\n%s",
          documentId,
          documentType,
          emailMessageId,
          contentBuilder
        )
      );
      Colors.Reset();
      return UserMessage.builder()
        .addContent(new TextContent(contentBuilder.toString()))
        .build();
    } catch (IllegalArgumentException ex) {
      Colors.Set(c -> c.RED + c.BRIGHT);
      log.error("Key Point Content Injection: " + ex.getMessage(), ex);
      Colors.Reset();
      return UserMessage.builder().addContent(new TextContent("PING")).build();
    }
  }

  String lookupDocumentText(String userInput) {
    Integer thisDocumentId;
    try {
      thisDocumentId = Integer.parseInt(userInput);
    } catch (IllegalArgumentException ex) {
      // Could not parse input as an integer, so we assume it's actual email content
      return userInput;
    }
    try {
      this.documentId = thisDocumentId;
      var resultset = Db.getInstance()
        .selectSingleRow(
          "SELECT content, document_type, email_id FROM document_units WHERE unit_id = ?",
          thisDocumentId
        );
      if (resultset == null) {
        throw new IllegalArgumentException(
          "No message found with ID: " + userInput
        );
      }
      this.emailMessageId = UUID.fromString(resultset.get(2).toString());
      this.documentType = resultset.get(1).toString();
      return resultset.get(0).toString();
    } catch (SQLException ex) {
      log.error("Unexpected SQL failure looking up document contents", ex);
      // Note it may not be entirely the argument's fault, but we want to make it easy to catch
      throw new IllegalArgumentException(ex.getMessage(), ex);
    }
  }

  String summarizePolicyMatch(Content content, String emailMessageInput) {
    var contentBuilder = new StringBuilder();

    var meta = content.textSegment().metadata();
    String policyType;
    String chapter;
    policyType = PolicyTypeConstants.getDescription(
      meta.getString("policy_type_id")
    );
    if (meta.getString("policy_chapter") == null) {
      chapter = Objects.requireNonNullElse(
        meta.getString("policy_description"),
        ""
      ).toString();
    } else {
      chapter = meta.getString("policy_chapter").toString();
    }
    var matchedText = content.textSegment().text();
    var summary =
      this.completionLanguageModel.chat(
          String.format(
            "Given the following policy and message, extract relevant text from the policy.  Base your response soley on the content within the policy - references to other policies or content that is not present should not be considered.  Rate from 1-100 whether the information is valuable to further analysis.  If that rating is below 50, respond wiht only the word \"skip\"; otherwise, respond with relevant extracted policy text.\nBEGIN POLICY\n%s\nEND POLICY\nBEGIN MESSAGE\n%s\nEND MESSAGE\n",
            matchedText,
            emailMessageInput
          )
        );
    if (summary != "skip") {
      summary = summary.replaceAll("\n", " ");
      contentBuilder.append("\n - (From " + policyType + " " + chapter);
      var internalPolicyId = Objects.requireNonNullElse(
        meta.getString("policy_id"),
        ""
      );
      if (!internalPolicyId.isEmpty()) {
        contentBuilder.append(", Internal Policy Id = " + internalPolicyId);
      }
      contentBuilder.append(" ): ").append(summary).append("\n");
    }

    return contentBuilder.toString();
  }

  @Override
  protected AzureAiSearchContentRetriever.Builder prepareEmailSearchRetriever(
    AzureAiSearchContentRetriever.Builder builder
  ) {
    return null;
  }

  @Override
  protected AzureAiSearchContentRetriever.Builder preparePolicySearchRetriever(
    AzureAiSearchContentRetriever.Builder builder
  ) {
    return builder.maxResults(30).minScore(.4);
  }

  @Override
  protected DefaultRetrievalAugmentorBuilder prepareRetrievalAugmentor(
    DefaultRetrievalAugmentorBuilder builder,
    AzureAiSearchContentRetriever policyRetriever,
    AzureAiSearchContentRetriever emailRetriever
  ) {
    return super.prepareRetrievalAugmentor(
      builder,
      policyRetriever,
      emailRetriever
    ).contentInjector(this);
  }

  @Override
  protected <T> AiServices<T> prepareAssistantService(
    AiServices<T> builder,
    RetrievalAugmentor retrievalAugmentor,
    ChatMemory chatMemory
  ) {
    // No chat memory saves on context space
    return super.prepareAssistantService(
      builder,
      retrievalAugmentor,
      null
    ).tools(new AddKeyPointsTool());
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
    if (detectedPoints < 15 && autoResponseCount < 1) {
      if (lastUserMessage != "Are you sure there are no more key points?") {
        autoResponseCount++;
        return String.format(
          "You only detected %d points - are you sure there are no more?  The last point you found was -\n%s\nHere is the message again:\n%s",
          detectedPoints,
          _lastKeyPoint,
          lastUserMessage
        );
      }
    }
    return "exit";
  }

  String _lastKeyPoint;

  class AddKeyPointsTool {

    @Tool(
      name = "addKeyPointToDatabase",
      value = "Adds a key point identified from the email to our database for further analysis.  " +
      "If the Internal Policy ID of the policy or law the key point relates to is known, pass it in.  " +
      "Otherwise ensure the key point includes information that can be used to identify the policy in question.  " +
      "  The percentage to which the policy relates to the email content is passed as relevancePercentage." +
      "  The degree to which the school's actions and words demonstrate compliance with policy is passed as compliancePercentage."
    )
    public void addKeyPointToDatabase(
      @P(
        required = true,
        value = "A summary of the key point.  It should include enough information to be clear about how the policy is spoken to in the current email.  If the Internal Policy Id " +
        "of the policy is not known the summary should include enough information to identify which policy, law, or other school obligation the point relates to.  If the Internal Policy Id is known this information can be omitted."
      ) String keyPointSummary,
      @P(
        required = true,
        value = "The percentage to which the point is relevant and/or warrants further analysis and investigation given the information found in the email."
      ) Double relevancePercentage,
      @P(
        required = true,
        value = "The percentage to which the this point demonstrates the school is in compliance with the associated obligation, with 0 representing total non-compliance."
      ) Double compliancePercentage,
      @P(
        required = false,
        value = "If known, the Internal Policy Id of the policy or law the key point relates to.  If not known, a value of -1 should be provided and the summary should include information about the identified obligation."
      ) Integer internalPolicyId,
      @P(
        required = false,
        value = "A comma-delimited list of names of policy or law the point can cross-reference."
      ) String crossReferencedPolicyNames
    ) {
      try {
        // First, email property record
        if (emailMessageId == null) {
          log.warn(
            "Unable to record key point - no email message ID available.  Details: " +
            keyPointSummary
          );
          return;
        }
        var emailPropertyId = UUID.randomUUID();
        var updated = Db.getInstance()
          .executeUpdate(
            "INSERT INTO email_property " +
            "(property_id, email_id, email_property_type_id, property_value, created_on) " +
            "VALUES " +
            "(?,?,9,?,now())",
            emailPropertyId,
            emailMessageId,
            keyPointSummary
          );
        if (updated < 1) {
          throw new SQLException(
            "Uknown failure creating an email property record."
          );
        }
        updated = Db.getInstance()
          .executeUpdate(
            "INSERT INTO key_points_details " +
            "(property_id, policy_id, relevance, compliance) " +
            "VALUES " +
            "(?,?,?,?)",
            emailPropertyId,
            internalPolicyId < 1 ? null : internalPolicyId,
            relevancePercentage,
            compliancePercentage
          );
      } catch (SQLException ex) {
        log.error(
          "Unexpected SQL failure recording key point.  Details: " +
          keyPointSummary,
          ex
        );
      }
      Colors.Set(color -> color.BRIGHT + color.CYAN);
      detectedPoints++;
      log.info(
        "Adding Key Point to database:\n\tRelevance: " +
        relevancePercentage +
        "\n\tCompliance Percentage: " +
        compliancePercentage +
        "\n\tInternal Policy ID: " +
        internalPolicyId +
        "\n\tCross Reference: " +
        Objects.requireNonNullElse(crossReferencedPolicyNames, "<none>") +
        "\n\tKey Point:" +
        keyPointSummary
      );
      _lastKeyPoint = keyPointSummary;
      Colors.Reset();
    }

    @Tool(
      name = "lookupInternalId",
      value = "Looks up the internal ID of a policy given the policy number, name, or identifier of the file within a vector store."
    )
    Integer lookupInternalId(
      @P(
        required = false,
        value = "The policy number or chapter of the statute."
      ) String policyNumber,
      @P(
        required = false,
        value = "The name of the policy or statute."
      ) String policyName,
      @P(
        required = false,
        value = "The ID of the file within a vector store; eg, assistant-7CJsuiaeoSn2vLQUbDeq4n"
      ) String fileId
    ) {
      try {
        if (fileId != null) {
          var res = Db.getInstance()
            .selectSingleValue(
              "SELECT policy_id FROM policies_statutes WHERE indexed_file_id=?",
              fileId
            );
          if (res != null) {
            return Integer.parseInt(res.toString());
          }
        }
        if (policyNumber != null) {
          var res = Db.getInstance()
            .selectSingleValue(
              "SELECT policy_id FROM policies_statutes WHERE chapter=?",
              policyNumber
            );
          if (res != null) {
            return Integer.parseInt(res.toString());
          }
        }
      } catch (SQLException ex) {
        log.error("Unexpected SQL failure looking up internal ID", ex);
      }
      return -1;
    }
  }

  public static void run(String[] args) {
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
    emailSummarizer.talkWith();
  }
}
