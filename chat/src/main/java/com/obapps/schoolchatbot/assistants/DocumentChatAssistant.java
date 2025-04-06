package com.obapps.schoolchatbot.assistants;

import com.obapps.schoolchatbot.assistants.content.AugmentedContentList;
import com.obapps.schoolchatbot.data.IMessageMetadata;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.rag.content.Content;
import dev.langchain4j.rag.content.injector.ContentInjector;
import java.util.List;

/**
 * The DocumentChatAssistant class is an abstract implementation of a chat assistant
 * that provides functionality for handling and injecting document-related content
 * into user messages. It extends the ChatAssistant class and implements the
 * ContentInjector interface.
 *
 * <p>This class is designed to work with an AugmentedContentList, which represents
 * a collection of content with additional metadata. It provides methods to generate
 * prompts, retrieve document-aware request preambles, and extract document contents
 * with or without metadata.</p>
 *
 * <p>Key Features:</p>
 * <ul>
 *   <li>Injects content from a list of documents into user messages.</li>
 *   <li>Generates prompts based on user messages and document context.</li>
 *   <li>Retrieves metadata and content from active documents.</li>
 *   <li>Supports customizable document-aware request preambles.</li>
 * </ul>
 *
 * <p>Usage Notes:</p>
 * <ul>
 *   <li>The {@code inject} method initializes the content list and generates a
 *       prompt based on the provided user message.</li>
 *   <li>The {@code getMessageMetadata} method is deprecated and should be replaced
 *       with {@code getMessageMetadata(AugmentedContentList contents)}.</li>
 *   <li>Static utility methods are provided for generating request preambles and
 *       retrieving document contents.</li>
 * </ul>
 *
 * <p>Subclasses must implement the {@code generatePrompt} method to define how
 * prompts are generated based on user messages.</p>
 *
 * @see ChatAssistant
 * @see ContentInjector
 * @see AugmentedContentList
 */
public abstract class DocumentChatAssistant
  extends ChatAssistant
  implements ContentInjector {

  /**
   * Protected constructor for the DocumentChatAssistant class.
   * Initializes a new instance of the DocumentChatAssistant.
   * This constructor is intended to be used within the package or by subclasses.
   */
  protected DocumentChatAssistant() {
    super();
    this.phaseId = 0;
  }

  /**
   * Constructs a new instance of the DocumentChatAssistant.
   *
   * @param initialRequest The initial request or message to set as the auto-response
   *                       for this assistant.
   */
  protected DocumentChatAssistant(AssistantProps props) {
    super();
    this.setAutoResponse(props.initialRequest);
    this.phaseId = props.phase;
  }

  private final Integer phaseId;

  protected Integer getPhase() {
    return phaseId;
  }

  /**
   * Represents the augmented content list used by the assistant.
   * This field is protected to allow access within the class and its subclasses.
   * Is set on prompt injection.
   */
  protected AugmentedContentList Content;

  /**
   * Injects augmented content into the user message and generates a prompt.
   *
   * @param sourceContent A list of content objects to be augmented and injected.
   * @param userMessage The user message to which the augmented content will be applied.
   * @return A new UserMessage object with the generated prompt.
   */
  public final UserMessage inject(
    List<Content> sourceContent,
    UserMessage userMessage
  ) {
    Content = AugmentedContentList.from(sourceContent);
    return generatePrompt(userMessage);
  }

  /**
   * Generates a prompt based on the current stage and the provided user input.
   *
   * @param userMessage The user message containing the input content and context.
   * @return A UserMessage object representing the generated prompt.
   */
  protected abstract UserMessage generatePrompt(UserMessage userMessage);

  public AugmentedContentList getContent() {
    return Content;
  }

  @Deprecated // Use getMessageMetadata(AugmentedContentList contents) instead
  public IMessageMetadata getMessageMetadata() {
    return Content.hasEmailMetadata() ? Content.getActiveDocument() : null;
  }

  /**
   * Retrieves the contents of a document.
   * This method acts as a wrapper to fetch the document contents
   * with default parameters.
   *
   * @return The contents of the document as a String.
   */
  protected String getDocumentContents() {
    return getDocumentContents(Content, true);
  }

  /**
   * Retrieves the contents of a document, optionally including metadata.
   *
   * @param includeMetadata A Boolean flag indicating whether to include metadata in the document contents.
   * @return A String representing the contents of the document, with or without metadata based on the input flag.
   */
  protected String getDocumentContents(Boolean includeMetadata) {
    return getDocumentContents(Content, true);
  }

  /**
   * Retrieves the contents of a document from the provided AugmentedContentList.
   * This method delegates to an overloaded version of getDocumentContents with
   * additional parameters.
   *
   * @param contents The AugmentedContentList containing the document data.
   * @return A String representing the contents of the document.
   */
  protected static String getDocumentContents(AugmentedContentList contents) {
    return getDocumentContents(contents, true);
  }

  /**
   * Retrieves the content of the active document from the provided
   * AugmentedContentList. Optionally includes metadata in the output.
   *
   * @param contents The AugmentedContentList containing the document content.
   * @param includeMetadata A Boolean indicating whether to include metadata
   *                         in the returned content.
   * @return A String containing the document content, optionally prefixed
   *         with metadata. If no active document is found, an error message
   *         is returned.
   */
  protected static String getDocumentContents(
    AugmentedContentList contents,
    Boolean includeMetadata
  ) {
    var message = contents.getActiveDocumentContent();
    if (message == null) {
      return "** ERROR: No document found in context. **";
    }
    var builder = new StringBuilder();
    if (includeMetadata) {
      builder.append("\nMetadata here\n");
    }
    builder.append(message.getObject().getContent());
    return builder.toString();
  }
}
