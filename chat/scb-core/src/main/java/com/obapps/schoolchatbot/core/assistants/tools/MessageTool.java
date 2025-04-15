package com.obapps.schoolchatbot.core.assistants.tools;

import com.obapps.schoolchatbot.core.assistants.DocumentChatAssistant;
import com.obapps.schoolchatbot.core.assistants.content.AugmentedContent;
import com.obapps.schoolchatbot.core.assistants.content.AugmentedContentListBase;
import com.obapps.schoolchatbot.core.models.IMessageMetadata;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * The MessageTool class provides functionality for handling message metadata
 * and tracking detected points. It is designed to be extended by other classes
 * and provides protected methods for managing detected points.
 *
 * <p>This class is initialized with an IMessageMetadata instance and sets up
 * a logger for logging purposes. It also maintains a count of detected points
 * which can be incremented using the provided method.</p>
 *
 * <p>Fields:</p>
 * <ul>
 *   <li>{@code message} - The message metadata associated with this tool.</li>
 *   <li>{@code log} - The logger instance for logging operations.</li>
 *   <li>{@code detectedPoints} - The count of detected points, initialized to 0.</li>
 * </ul>
 *
 * <p>Methods:</p>
 * <ul>
 *   <li>{@code getDetectedPoints()} - Returns the current count of detected points.</li>
 *   <li>{@code addDetectedPoint()} - Increments the count of detected points by 1.</li>
 * </ul>
 *
 * <p>Note: This class is intended to be extended and its constructor is protected
 * to restrict direct instantiation.</p>
 */
public class MessageTool<TListType extends AugmentedContentListBase> {

  protected MessageTool(DocumentChatAssistant<TListType> assistant) {
    this.assistant = assistant;
    this.log = LoggerFactory.getLogger(this.getClass());
  }

  DocumentChatAssistant<TListType> assistant;

  /**
   * Retrieves the number of detected points.
   *
   * @return the detected points as an Integer.
   */
  public Integer getDetectedPoints() {
    return assistant.getDetectedPoints();
  }

  /**
   * Increments the count of detected points by one.
   * This method is used to track the number of detected points
   * during the execution of the program.
   */
  protected void addDetectedPoint() {
    assistant.addDetectedPoint(null);
  }

  /**
   * Increments the count of detected points by one.
   * This method is used to track the number of detected points
   * during the execution of the program.
   */
  protected void addDetectedPoint(AugmentedContent content) {
    assistant.addDetectedPoint(content);
  }

  /**
   * Increments the count of detected points by one.
   * This method is used to track the number of detected points
   * during the execution of the program.
   */
  protected void addNote() {
    assistant.addNote();
  }

  protected void processingCompletedCalled(Integer documentId) {
    var msg = this.message();
    if (msg != null && msg.getDocumentId().equals(documentId)) {
      log.info("Processing completed for document ID: {}", documentId);
      assistant.setAnalysisCompleteCalled(true);
    } else {
      log.warn(
        "Received processing completed call for document ID: {} but no active document found.",
        documentId
      );
    }
  }

  /**
   * Retrieves the augmented content list from the assistant.
   *
   * @return an instance of {@link AugmentedContentListBase} containing the content
   *         provided by the assistant.
   */
  protected TListType getContent() {
    return assistant.getContent();
  }

  /**
   * Retrieves the metadata of the currently active document from the assistant.
   *
   * @return An instance of {@code IMessageMetadata} representing the metadata
   *         of the active document.
   */
  protected IMessageMetadata message() {
    var content = assistant.getContent();
    if (content == null) {
      return null;
    }
    return content.getActiveDocument();
  }

  protected final Logger log;
}
