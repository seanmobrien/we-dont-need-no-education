package com.obapps.schoolchatbot.util;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
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
}
