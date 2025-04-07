package com.obapps.schoolchatbot.util;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class Strings {

  public static final String getRecordPrefix(String recordName) {
    return getRecordPrefix(recordName, null);
  }

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

  public static final String getRecordSuffix() {
    return "\n_#_ END _#_\n";
  }

  public static final String getRecordOutput(
    String recordName,
    String recordData
  ) {
    return getRecordOutput(recordName, recordData, null);
  }

  public static final String getRecordOutput(
    String recordName,
    String recordData,
    Map<String, Object> metadata
  ) {
    return (
      getRecordPrefix(recordName, metadata) + recordData + getRecordSuffix()
    );
  }

  public static ObjectMapper objectMapperFactory() {
    ObjectMapper objectMapper = new ObjectMapper();
    objectMapper.registerModule(new JavaTimeModule());
    //.registerModule(new JSR310Module());
    return objectMapper;
  }

  /**
   * Converts a comma-separated string into a list of strings.
   *
   * @param str the input string containing elements separated by commas
   * @return a list of strings obtained by splitting the input string on commas
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
   * @param str       The input string to be split. Can be null or empty.
   * @param delimiter The delimiter used to split the input string.
   * @return A list of trimmed substrings obtained by splitting the input string. Returns an empty
   *         list if the input string is null or empty.
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
}
