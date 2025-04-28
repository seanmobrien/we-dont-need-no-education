package com.obapps.schoolchatbot.core.assistants;

import com.obapps.core.util.Db;

/**
 * Represents the properties of an assistant.
 *
 * <p>This class provides a flexible way to configure and manage properties
 * for different types of assistants. It supports method chaining for
 * setting properties fluently.</p>
 *
 * <p>Key Features:</p>
 * <ul>
 *   <li>Allows setting the initial request string.</li>
 *   <li>Supports associating a database instance with the assistant.</li>
 *   <li>Provides a generic type parameter for fluent method chaining.</li>
 * </ul>
 *
 * <p>Example usage:</p>
 * <pre>
 * {@code
 * AssistantProps props = new AssistantProps(1)
 *     .setInitialRequest("Hello")
 *     .setDatabase(new Db());
 * }
 * </pre>
 *
 * @param <T> The type of the assistant extending this class.
 */
public class AssistantProps {

  public AssistantProps(Integer phase) {
    this.phase = phase;
    this.includeReplyTo = false;
  }

  @SuppressWarnings("unchecked")
  public <T extends AssistantProps> T setInitialRequest(String initialRequest) {
    this.initialRequest = initialRequest;
    return (T) this;
  }

  public Boolean includeReplyTo;
  public String initialRequest;
  public Integer phase;
  public Db database;

  @SuppressWarnings("unchecked")
  public <T extends AssistantProps> T setDatabase(Db database) {
    this.database = database;
    return (T) this;
  }

  @SuppressWarnings("unchecked")
  public <T extends AssistantProps> T setIncludeReplyTo(
    Boolean includeReplyTo
  ) {
    this.includeReplyTo = includeReplyTo;
    return (T) this;
  }
}
