package com.obapps.schoolchatbot.core.assistants.models.search;

import java.util.HashMap;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Represents a search result in the AI system.
 * This class encapsulates the details of a search result, including its content,
 * metadata, and associated record information.
 *
 * <p>Key features of this class include:</p>
 * <ul>
 *   <li>Content of the search result.</li>
 *   <li>Record type and subtype associated with the search result.</li>
 *   <li>Metadata for additional information about the search result.</li>
 *   <li>Unique identifier for the search result.</li>
 *   <li>Builder pattern for constructing instances of {@link AiSearchResult}.</li>
 * </ul>
 *
 * <p>Example usage:</p>
 * <pre>{@code
 * AiSearchResult result = AiSearchResult.builder()
 *     .id("12345")
 *     .title("Example Title")
 *     .content("This is the content of the search result.")
 *     .recordType("Document")
 *     .recordSubType("PDF")
 *     .metadata(Map.of("author", "John Doe"))
 *     .build();
 * }</pre>
 *
 * <p>Thread safety: This class is not thread-safe. If multiple threads access
 * an instance of this class concurrently, external synchronization is required.</p>
 */
public class AiSearchResult {

  /**
   * The unique identifier of the search result.
   */
  private String id;

  /**
   * The title of the search result.
   */
  private String title;

  /**
   * The content of the search result.
   */
  private String content;

  /**
   * The type of the record associated with the search result.
   */
  private String recordType;

  /**
   * The subtype of the record associated with the search result.
   */
  private String recordSubType;

  /**
   * Additional metadata associated with the search result.
   */
  private Map<String, String> metadata;

  /**
   * The score of the search result.
   */
  private Double score;

  /**
   * Gets the unique identifier of the search result.
   *
   * @return the unique identifier.
   */
  public String getId() {
    return this.id;
  }

  /**
   * Sets the unique identifier of the search result.
   *
   * @param id the unique identifier to set.
   */
  protected void setId(String id) {
    this.id = id;
  }

  /**
   * Retrieves the type of the record associated with this instance.
   *
   * @return A string representing the record type.
   */
  public String getRecordType() {
    return this.recordType;
  }

  /**
   * Retrieves the subtype of the record.
   *
   * @return A string representing the record subtype.
   */
  public String getRecordSubType() {
    return this.recordSubType;
  }

  /**
   * Gets the score of the search result.
   *
   * @return the score.
   */
  public Double getScore() {
    return this.score;
  }

  /**
   * Sets the score of the search result.
   *
   * @param score the score to set.
   */
  protected void setScore(Double score) {
    this.score = score;
  }

  /**
   * Gets the title of the search result.
   *
   * @return the title.
   */
  public String getTitle() {
    return this.title;
  }

  /**
   * Gets the content of the search result.
   *
   * @return the content.
   */
  public String getContent() {
    return this.content;
  }

  /**
   * Retrieves the value associated with the specified key from the metadata map.
   * If the metadata map is null, this method returns null.
   *
   * @param key the key whose associated value is to be returned
   * @param defaultValue the default value to return if the key is not found (currently unused)
   * @return the value associated with the specified key, or null if the metadata map is null
   */

  public String getMetaString(String key) {
    return getMetaString(key, null);
  }

  /**
   * Retrieves the value associated with the specified key from the metadata map.
   * If the metadata map is null, this method returns null.
   *
   * @param key the key whose associated value is to be returned
   * @param defaultValue the default value to return if the key is not found (currently unused)
   * @return the value associated with the specified key, or null if the metadata map is null
   */
  public String getMetaString(String key, String defaultValue) {
    if (metadata == null || !metadata.containsKey(key)) {
      return defaultValue;
    }
    return metadata.get(key);
  }

  /**
   * Retrieves the value associated with the specified key from the metadata map.
   * If the metadata map is null or key not available, this method returns 0.
   *
   * @param key the key whose associated value is to be returned
   * @return the value associated with the specified key, or null if the metadata map is null
   */

  public Integer getMetaInt(String key) {
    return getMetaInt(key, 0);
  }

  /**
   * Retrieves the value associated with the specified key from the metadata map.
   * If the metadata map is null, this method returns null.
   *
   * @param key the key whose associated value is to be returned
   * @param defaultValue the default value to return if the key is not found (currently unused)
   * @return the value associated with the specified key, or null if the metadata map is null
   */
  public Integer getMetaInt(String key, Integer defaultValue) {
    var raw = getMetaString(key, defaultValue.toString());
    try {
      return Integer.parseInt(raw);
    } catch (NumberFormatException e) {
      return defaultValue;
    }
  }

  /**
   * Extracts metadata for output in a record format.
   *
   * @return A map containing the metadata as key-value pairs, or {@code null} if no metadata is available.
   */
  public Map<String, Object> getMetatadaForRecord() {
    if (this.metadata == null) {
      return null;
    }
    Map<String, Object> metadataMap = new HashMap<>();

    for (Map.Entry<String, String> entry : this.metadata.entrySet()) {
      var kvp = mapMetadataEntryForRecord(entry);
      if (kvp == null) {
        continue;
      }
      metadataMap.put(kvp.getKey(), kvp.getValue());
    }
    return metadataMap;
  }

  /**
   * Transforms an internal metadata entry into a format suitable for use in a search record.
   *
   * @param entry the metadata entry to be transformed, represented as a key-value pair
   *              where both the key and value are strings.
   * @return a new metadata entry represented as a key-value pair where the key is a string
   *         and the value is an object, suitable for use in a search record.
   */
  protected Map.Entry<String, Object> mapMetadataEntryForRecord(
    Map.Entry<String, String> entry
  ) {
    return Map.entry(entry.getKey(), entry.getValue());
  }

  /**
   * Extracts metadata from a JSON object.
   *
   * @param result the JSON object containing metadata.
   * @return a map of metadata key-value pairs.
   */
  protected static Map<String, String> extractMetadata(JSONObject result) {
    if (result == null) {
      return Map.of();
    }
    JSONObject metadata = result.getJSONObject("metadata");
    JSONArray attributes = metadata.getJSONArray("attributes");
    HashMap<String, String> metadataMap = new HashMap<>();
    for (int j = 0; j < attributes.length(); j++) {
      JSONObject attribute = attributes.getJSONObject(j);
      metadataMap.put(attribute.getString("key"), attribute.getString("value"));
    }
    return metadataMap;
  }

  @SuppressWarnings("unchecked")
  public static <T extends Builder> T builder() {
    Builder builder = new Builder();
    return (T) builder;
  }

  /**
   * Builder class for constructing instances of {@link AiSearchResult}.
   */
  public static class Builder {

    /**
     * The unique identifier of the search result.
     */
    private String id;

    /**
     * The score of the search result.
     */
    private Double score;

    /**
     * The content of the search result.
     */
    private String content;

    /**
     * The type of the record associated with the search result.
     */
    private String recordType;

    /**
     * The subtype of the record associated with the search result.
     */
    private String recordSubType;

    /**
     * Additional metadata associated with the search result.
     */
    private Map<String, String> metadata = new HashMap<>();

    /**
     * Sets the unique identifier of the search result.
     *
     * @param id the unique identifier to set.
     * @return the builder instance.
     */
    public Builder id(String id) {
      this.id = id;
      return this;
    }

    /**
     * Sets the title of the search result.
     *
     * @param title the title to set.
     * @return the builder instance.
     */
    public Builder score(Double score) {
      this.score = score;
      return this;
    }

    /**
     * Sets the content of the search result.
     *
     * @param content the content to set.
     * @return the builder instance.
     */
    public Builder content(String content) {
      this.content = content;
      return this;
    }

    /**
     * Sets the type of the record associated with the search result.
     *
     * @param recordType the record type to set.
     * @return the builder instance.
     */
    public Builder recordType(String recordType) {
      this.recordType = recordType;
      return this;
    }

    /**
     * Sets the subtype of the record associated with the search result.
     *
     * @param recordSubType the record subtype to set.
     * @return the builder instance.
     */
    public Builder recordSubType(String recordSubType) {
      this.recordSubType = recordSubType;
      return this;
    }

    /**
     * Sets the metadata associated with the search result.
     *
     * @param metadata the metadata to set.
     * @return the builder instance.
     */
    public Builder metadata(Map<String, String> metadata) {
      this.metadata = metadata;
      return this;
    }

    public Builder raw(JSONObject result) {
      if (result == null) {
        return this;
      }
      content(result.getString("content")).metadata(extractMetadata(result));
      if (result.has("@search.score")) {
        score(result.getDouble("@search.score"));
      }
      if (result.has("metadata")) {
        var meta = result.getJSONObject("metadata");
        if (meta != null && meta.has("attributes")) {
          var attributes = meta.getJSONArray("attributes");
          for (int i = 0; i < attributes.length(); i++) {
            var attribute = attributes.getJSONObject(i);
            this.metadata.put(
                attribute.getString("key"),
                attribute.getString("value")
              );
          }
        }
      }
      return this;
    }

    /**
     * Builds an instance of {@link AiSearchResult} using the set properties.
     *
     * @return the constructed {@link AiSearchResult} instance.
     */
    public AiSearchResult build() {
      AiSearchResult result;

      if (this.metadata != null && this.metadata.containsKey("document_type")) {
        result = new AiDocumentSearchResult();
      } else if (
        this.metadata != null && this.metadata.containsKey("policy_type_id")
      ) {
        result = new AiPolicySearchResult();
      } else {
        result = new AiSearchResult();
        result.recordType = this.recordType;
        result.recordSubType = this.recordSubType;
      }
      result.setId(this.id);
      result.setScore(score); // Default score is null
      result.content = this.content;
      result.metadata = this.metadata;
      return result;
    }
  }
}
