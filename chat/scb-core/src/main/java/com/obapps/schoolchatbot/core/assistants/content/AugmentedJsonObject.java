package com.obapps.schoolchatbot.core.assistants.content;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.obapps.core.util.*;
import dev.langchain4j.rag.content.Content;
import org.slf4j.LoggerFactory;

/**
 * Represents an abstract class that extends {@link AugmentedContent} and provides functionality
 * for handling JSON content. This class is designed to work with a specific type of object
 * represented by the generic parameter {@code T}.
 *
 * <p>The {@code AugmentedJsonObject} class uses the Jackson library to parse JSON content
 * into an object of the specified type {@code T}. It ensures that the JSON content is only
 * deserialized once and cached for subsequent access.</p>
 *
 * @param <T> The type of the object that this class handles, which must correspond to the
 *            JSON structure being parsed.
 *
 * <p><strong>Key Features:</strong></p>
 * <ul>
 *   <li>Lazy initialization of the JSON object using the {@link ObjectMapper}.</li>
 *   <li>Error handling for JSON mapping and processing exceptions, with detailed logging.</li>
 *   <li>Support for specifying the target class type at runtime.</li>
 * </ul>
 *
 * <p><strong>Usage:</strong></p>
 * <pre>{@code
 * Content content = ...; // Obtain content from a source
 * AugmentedJsonObject<MyClass> jsonObject = new MyAugmentedJsonObject<>(content, MyClass.class);
 * MyClass myObject = jsonObject.getObject();
 * }</pre>
 *
 * <p><strong>Thread Safety:</strong></p>
 * This class is not thread-safe. If multiple threads access the same instance, external
 * synchronization is required.
 *
 * <p><strong>Dependencies:</strong></p>
 * This class depends on the Jackson library for JSON processing and SLF4J for logging.
 */
public abstract class AugmentedJsonObject<T> extends AugmentedContent {

  private T jsonObject;
  private final Class<T> type;

  /**
   * Constructs an AugmentedJsonObject with the specified content source and type.
   *
   * @param source The content source used to initialize the object.
   * @param type   The class type associated with this object.
   * @param <T>    The type parameter representing the class type.
   */
  public AugmentedJsonObject(Content source, Class<T> type) {
    super(source);
    this.type = type;
  }

  public String getJson() {
    return getText();
  }

  /**
   * Retrieves an object of type T by deserializing the JSON content.
   *
   * @return An object of type T deserialized from the JSON content.
   * @throws RuntimeException if there is an error during JSON deserialization.
   *
   * <p><strong>Example Usage:</strong></p>
   * <pre>{@code
   * Content content = ...; // Obtain content from a source
   * AugmentedJsonObject<MyClass> jsonObject = new MyAugmentedJsonObject<>(content, MyClass.class) {
   *     @Override
   *     public MyClass getObject() {
   *         return this.getObject(json -> {
   *             ObjectMapper objectMapper = new ObjectMapper();
   *             // Custom deserialization logic
   *             MyClass myObject = objectMapper.readValue(json, MyClass.class);
   *             myObject.setCustomField("Custom Value");
   *             return myObject;
   *         });
   *     }
   * };
   * MyClass myObject = jsonObject.getObject();
   * }</pre>
   */
  public T getObject() {
    return this.getObject(json -> {
        ObjectMapper objectMapper = Strings.objectMapperFactory();
        return (T) objectMapper.readValue(getText(), type);
      });
  }

  /**
   * Retrieves an object of type {@code T} by parsing the JSON text using the provided
   * {@code parseJson} function. If the JSON text cannot be parsed or mapped to the
   * desired object type, appropriate exceptions are logged.
   *
   * @param parseJson A function that takes a JSON string and returns an object of type {@code T}.
   * @return The parsed object of type {@code T}, or {@code null} if parsing fails.
   * @throws JsonMappingException If there is an error mapping the JSON to the object of type {@code T}.
   * @throws JsonProcessingException If there is an error processing the JSON text.
   */
  public final T getObject(ThrowingFunction<String, T> parseJson) {
    if (jsonObject == null) {
      var text = getText();
      try {
        if (text != null && !text.isEmpty()) {
          jsonObject = parseJson.apply(text);
        }
      } catch (JsonMappingException e) {
        LoggerFactory.getLogger(this.type).error(
          "Error mapping JSON to object of type " +
          type.getName() +
          ": " +
          e.getMessage() +
          "\nText: " +
          getText(),
          e
        );
        e.printStackTrace();
      } catch (JsonProcessingException e) {
        LoggerFactory.getLogger(this.type).error(
          "Error processing JSON for object of type " +
          type.getName() +
          ": " +
          e.getMessage() +
          "\nText: " +
          getText(),
          e
        );
      }
    }
    return jsonObject;
  }

  @FunctionalInterface
  public interface ThrowingFunction<T, R> {
    R apply(T t) throws JsonMappingException, JsonProcessingException;
  }
}
