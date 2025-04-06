package com.obapps.schoolchatbot.assistants.tools;

import com.obapps.schoolchatbot.assistants.DocumentChatAssistant;
import com.obapps.schoolchatbot.data.IMessageMetadata;
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
public class MessageTool {

  protected MessageTool(DocumentChatAssistant assistant) {
    this.assistant = assistant;
    this.log = LoggerFactory.getLogger(this.getClass());
  }

  DocumentChatAssistant assistant;

  /**
   * Retrieves the number of detected points.
   *
   * @return the detected points as an Integer.
   */
  public Integer getDetectedPoints() {
    return detectedPoints;
  }

  /**
   * Increments the count of detected points by one.
   * This method is used to track the number of detected points
   * during the execution of the program.
   */
  protected void addDetectedPoint() {
    detectedPoints++;
  }

  protected IMessageMetadata message() {
    return assistant.getContent().getActiveDocument();
  }

  protected final Logger log;
  private Integer detectedPoints = 0;
}
