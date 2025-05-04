package com.obapps.core.util;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.io.IOException;
import java.io.Reader;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Utility class for string manipulation and formatting.
 *
 * <p>This class provides various utility methods for working with strings,
 * including methods for generating record prefixes and suffixes, converting
 * comma-separated strings into lists, splitting strings based on delimiters,
 * and formatting strings to fit within a specified width.
 *
 * <p>Additionally, it includes a factory method for creating a pre-configured
 * Jackson {@link ObjectMapper} instance.
 *
 * <p>Key functionalities:
 * <ul>
 *   <li>Generate record prefixes and suffixes with optional metadata.</li>
 *   <li>Convert comma-separated strings into lists of trimmed substrings.</li>
 *   <li>Split strings into lists based on custom delimiters.</li>
 *   <li>Format strings for multi-line output with optional padding and word wrapping.</li>
 *   <li>Create a Jackson {@link ObjectMapper} with specific configurations.</li>
 * </ul>
 *
 * <p>All methods in this class are static and can be accessed directly without
 * creating an instance of the class.
 */
public class Strings {

  /**
   * Generates a record prefix string with optional metadata.
   *
   * @param recordName the name of the record.
   * @return the generated record prefix string.
   */
  public static final String getRecordPrefix(String recordName) {
    return getRecordPrefix(recordName, null);
  }

  /**
   * Generates a record prefix string with optional metadata.
   *
   * @param recordName the name of the record.
   * @param metadata optional metadata to include in the prefix.
   * @return the generated record prefix string.
   */
  public static final String getRecordPrefix(
    String recordName,
    Map<String, Object> metadata
  ) {
    var metaBuilder = new StringBuilder();
    if (metadata != null && !metadata.isEmpty()) {
      metaBuilder.append(" [ ");
      for (var entry : metadata.entrySet()) {
        var v = entry.getValue();
        if (v == null) {
          continue;
        }
        var stringValue = v.toString().trim();
        if (stringValue.length() == 0) {
          continue;
        }
        metaBuilder
          .append(entry.getKey())
          .append(": ")
          .append(entry.getValue())
          .append(" | ");
      }
      metaBuilder.setLength(metaBuilder.length() - 2); // Remove last comma and space
      metaBuilder.append("]");
    }
    return "\n_#_" + recordName + metaBuilder.toString() + "_#_\n";
  }

  /**
   * Generates a record suffix string.
   *
   * @return the generated record suffix string.
   */
  public static final String getRecordSuffix() {
    return "\n_#_ END _#_\n";
  }

  /**
   * Generates a complete record output string with prefix, data, and suffix.
   *
   * @param recordName the name of the record.
   * @param recordData the data of the record.
   * @return the complete record output string.
   */
  public static final String getRecordOutput(
    String recordName,
    String recordData
  ) {
    return getRecordOutput(recordName, recordData, null);
  }

  /**
   * Compares two strings for equality, ignoring case considerations.
   *
   * @param s1 the first string to compare, may be {@code null}
   * @param s2 the second string to compare, may be {@code null}
   * @return {@code true} if both strings are equal ignoring case, or both are {@code null};
   *         {@code false} otherwise
   */
  public static boolean compareIgnoreCase(String s1, String s2) {
    if (s1 == null && s2 == null) {
      return true;
    }
    if (s1 == null || s2 == null) {
      return false;
    }
    var l = Locale.getDefault();
    var v1 = s1.trim().toLowerCase(l);
    var v2 = s2.trim().toLowerCase(l);
    return v1.equals(v2) || v1 == v2;
  }

  /**
   * Generates a complete record output string with prefix, data, and suffix.
   *
   * @param recordName the name of the record.
   * @param recordData the data of the record.
   * @param metadata optional metadata to include in the output.
   * @return the complete record output string.
   */
  public static final String getRecordOutput(
    String recordName,
    String recordData,
    Map<String, Object> metadata
  ) {
    return (
      getRecordPrefix(recordName, metadata) + recordData + getRecordSuffix()
    );
  }

  /**
   * Generates a table representation of metadata.
   *
   * @param metadata the metadata to include in the table.
   * @return the generated table string.
   */
  public static final String getTable(Map<String, Object> metadata) {
    return getTable(metadata, null);
  }

  /**
   * Generates a table representation of metadata with an optional record name.
   *
   * @param metadata the metadata to include in the table.
   * @param recordName the optional name of the record.
   * @return the generated table string.
   */
  public static final String getTable(
    Map<String, Object> metadata,
    String recordName
  ) {
    if (metadata == null || metadata.isEmpty()) {
      return "";
    }
    var builder = new StringBuilder();
    if (recordName != null && !recordName.isEmpty()) {
      builder
        .append("---------- ")
        .append(recordName)
        .append(" ----------")
        .append("\n");
    }
    metadata.forEach((key, value) -> {
      builder.append(key).append(": ").append(value).append("\n");
    });
    return builder.toString();
  }

  /**
   * Creates a pre-configured Jackson {@link ObjectMapper} instance.
   *
   * @return the configured {@link ObjectMapper} instance.
   */
  public static ObjectMapper objectMapperFactory() {
    ObjectMapper objectMapper = new ObjectMapper();
    objectMapper.configure(
      com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES,
      false
    );
    objectMapper.registerModule(new JavaTimeModule());
    return objectMapper;
  }

  /**
   * Writes the given object to a file at the specified file path in JSON format.
   *
   * @param object   The object to be written to the file. It must be serializable.
   * @param filePath The path of the file where the object will be written.
   * @throws RuntimeException If an I/O error occurs during the writing process.
   */
  public static void writeObjectToFile(Object object, String filePath) {
    try {
      var objectMapper = objectMapperFactory();
      objectMapper.writeValue(new java.io.File(filePath), object);
    } catch (IOException e) {
      throw new RuntimeException(
        "Error writing object to file: " + filePath,
        e
      );
    }
  }

  /**
   * Safely serializes an object to a JSON string.
   *
   * @param object the object to serialize.
   * @return the serialized JSON string, or an error message if serialization fails.
   */
  public static String safelySerializeAsJson(Object object) {
    try {
      return serializeAsJson(object);
    } catch (Exception e) {
      return (
        "Error serializing object to JSON: " +
        e.getMessage() +
        "\n" +
        Arrays.toString(e.getStackTrace())
      );
    }
  }

  /**
   * Serializes an object to a JSON string.
   *
   * @param object the object to serialize.
   * @return the serialized JSON string.
   * @throws RuntimeException if serialization fails.
   */
  public static String serializeAsJson(Object object) {
    ObjectMapper objectMapper = Strings.objectMapperFactory();
    try {
      return objectMapper.writeValueAsString(object);
    } catch (JsonProcessingException e) {
      throw new RuntimeException(
        "Error serializing " + object.getClass().getName() + " to JSON",
        e
      );
    }
  }

  /**
   * Serializes an object to a JSON string.
   *
   * @param object the object to serialize.
   * @return the serialized JSON string.
   * @throws RuntimeException if serialization fails.
   */
  public static <T> T loadFromJson(Class<T> clazz, String source) {
    ObjectMapper objectMapper = Strings.objectMapperFactory();
    try {
      return (T) objectMapper.readValue(source, clazz);
    } catch (JsonProcessingException e) {
      throw new RuntimeException(
        "Error loading " + clazz.getName() + " from JSON",
        e
      );
    }
  }

  /**
   * Serializes an object to a JSON string.
   *
   * @param object the object to serialize.
   * @return the serialized JSON string.
   * @throws RuntimeException if serialization fails.
   */
  public static <T> T loadFromJsonStream(Class<T> clazz, Reader source) {
    ObjectMapper objectMapper = Strings.objectMapperFactory();
    try {
      return (T) objectMapper.readValue(source, clazz);
    } catch (JsonProcessingException e) {
      throw new RuntimeException(
        "Error loading " + clazz.getName() + " from JSON",
        e
      );
    } catch (IOException e) {
      throw new RuntimeException(
        "Error loading " + clazz.getName() + " from JSON",
        e
      );
    }
  }

  /**
   * Normalizes the given string for output by replacing specific characters
   * with their standard equivalents and trimming leading and trailing whitespace.
   *
   * <p>This method performs the following transformations:
   * <ul>
   *   <li>Replaces curly quotation marks (“ and ”) with standard double quotes (").</li>
   *   <li>Replaces various forms of single quotation marks (’ and ‘) with a standard single quote (').</li>
   *   <li>Trims any leading or trailing whitespace from the string.</li>
   * </ul>
   *
   * @param value the input string to be normalized; may be {@code null} or empty.
   * @return the normalized string, or the original string if it is {@code null} or empty.
   */
  public static String normalizeForOutput(String value) {
    if (value == null || value.isEmpty()) {
      return value;
    }
    return value
      .replaceAll("“|”", "\"")
      .replaceAll("’|‘|‘|’|‘|’|‘|’|’", "'")
      .trim();
  }

  /**
   * Converts a comma-separated string into a list of strings.
   *
   * @param str the input string containing elements separated by commas.
   * @return a list of strings obtained by splitting the input string on commas.
   */
  public static List<String> commasToList(String str) {
    return seperateIntoList(str, ",");
  }

  /**
   * Splits the given string into a list of trimmed substrings based on the specified delimiter.
   *
   * <p>If the input string is null or empty, an empty list is returned. Each substring is trimmed
   * of leading and trailing whitespace. If a substring starts and/or ends with a double quote (`"`),
   * the quotes are removed along with any additional leading or trailing whitespace.
   *
   * @param str the input string to be split. Can be null or empty.
   * @param delimiter the delimiter used to split the input string.
   * @return a list of trimmed substrings obtained by splitting the input string.
   */
  public static List<String> seperateIntoList(String str, String delimiter) {
    if (str == null || str.isEmpty()) {
      return List.of();
    }
    String[] parts = str.split(delimiter);
    List<String> list = new ArrayList<>();
    for (String part : parts) {
      String trimmedPart = part.trim();
      if (trimmedPart.startsWith("\"")) {
        trimmedPart = trimmedPart.substring(1).stripLeading();
      }
      if (trimmedPart.endsWith("\"")) {
        trimmedPart = trimmedPart
          .substring(0, trimmedPart.length() - 1)
          .stripTrailing();
      }
      if (!trimmedPart.isEmpty()) {
        list.add(trimmedPart);
      }
    }
    return list;
  }

  /**
   * Splits a given string into multiple lines, each with a maximum specified width.
   * Words are preserved and not split across lines.
   *
   * @param width the maximum width of each line in characters.
   * @param value the input string to be formatted into multiple lines.
   * @return a list of strings, where each string represents a line with a length
   *         not exceeding the specified width.
   *         The last line may be shorter than the specified width.
   * @throws NullPointerException if the input string {@code value} is null.
   */
  public static List<String> formatForMultipleLines(
    Integer width,
    String value
  ) {
    var result = new ArrayList<String>();
    if (value == null || value.isEmpty()) {
      return result;
    }
    String[] words = value.split(" ");
    StringBuilder lineBuilder = new StringBuilder();
    for (String word : words) {
      if (lineBuilder.length() + word.length() > width) {
        if (lineBuilder.length() > 0) {
          result.add(lineBuilder.toString().trim());
        }
        lineBuilder.setLength(0);
      }
      if (word.length() > 0) {
        lineBuilder.append(word).append(" ");
      }
    }
    if (lineBuilder.length() > 0) {
      result.add(lineBuilder.toString().trim());
    }
    return result;
  }

  /**
   * Converts a snake_case string to CamelCase, capitalizing the first letter of every group.
   *
   * @param snakeCase the input string in snake_case format.
   * @return the converted string in CamelCase format.
   */
  public static String snakeToCamelCase(String snakeCase) {
    if (snakeCase == null || snakeCase.isEmpty()) {
      return "";
    }
    String[] parts = snakeCase.split("_");
    StringBuilder camelCase = new StringBuilder(parts[0].toLowerCase());
    for (var idx = 1; idx < parts.length; idx++) {
      var part = parts[idx].trim();
      if (!part.isEmpty()) {
        camelCase
          .append(part.substring(0, 1).toUpperCase())
          .append(part.substring(1).toLowerCase());
      }
    }
    if (camelCase.length() == 0) {
      return "";
    }
    char firstChar = camelCase.charAt(0);
    if (Character.isUpperCase(firstChar)) {
      camelCase.setCharAt(0, Character.toLowerCase(firstChar));
    }
    return camelCase.toString();
  }
}
