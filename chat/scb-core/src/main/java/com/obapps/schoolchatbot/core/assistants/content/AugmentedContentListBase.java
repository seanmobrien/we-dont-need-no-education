package com.obapps.schoolchatbot.core.assistants.content;

import com.obapps.schoolchatbot.core.models.DocumentWithMetadata;
import dev.langchain4j.rag.content.Content;
import java.util.ArrayList;
import java.util.List;

/**
 * Represents a categorized list of augmented content objects. This class organizes
 * different types of augmented content into separate lists based on their type.
 *
 * <p>The supported content types include:</p>
 * <ul>
 *   <li>KeyPointsContent: Stored in the {@code KeyPoints} list.</li>
 *   <li>EmailMetadataContent: Stored in the {@code EmailMetadata} list.</li>
 *   <li>AugmentedEmailSearch: Stored in the {@code EmailSearch} list.</li>
 *   <li>AugmentedPolicySearch: Stored in the {@code PolicySearch} list.</li>
 *   <li>Other types: Stored in the {@code Other} list.</li>
 * </ul>
 *
 * <p>Provides utility methods to add content to the appropriate list, check for the
 * presence of specific types of content, and create an instance of this class from
 * a list of generic {@code Content} objects.</p>
 *
 * <p>Usage example:</p>
 * <pre>
 * {@code
 * List<Content> sourceContent = fetchContent();
 * AugmentedContentList augmentedList = AugmentedContentList.from(sourceContent);
 * if (augmentedList.hasKeyPoints()) {
 *     // Process key points
 * }
 * }
 * </pre>
 */
public class AugmentedContentListBase {

  public final List<DocumentWithMetadataContent> EmailMetadata = new ArrayList<
    DocumentWithMetadataContent
  >();
  public final List<AugmentedEmailSearch> EmailSearch = new ArrayList<
    AugmentedEmailSearch
  >();
  public final List<AugmentedPolicySearch> PolicySearch = new ArrayList<
    AugmentedPolicySearch
  >();

  public final List<DocumentAttachmentContent> Attachments = new ArrayList<
    DocumentAttachmentContent
  >();
  public final List<AugmentedContent> Other = new ArrayList<AugmentedContent>();

  public AugmentedContentListBase() {}

  /**
   * Adds an AugmentedContent object to the appropriate list based on its type.
   *
   * @param content the AugmentedContent object to be added. The type of the content
   *                determines which specific list it will be added to:
   *                <ul>
   *                  <li>KeyPoint: Added to the KeyPoints list.</li>
   *                  <li>EmailMetadata: Added to the EmailMetadata list.</li>
   *                  <li>EmailSearch: Added to the EmailSearch list.</li>
   *                  <li>PolicySearch: Added to the PolicySearch list.</li>
   *                  <li>Other types: Added to the Other list.</li>
   *                </ul>
   * @throws ClassCastException if the content cannot be cast to the expected type
   *                            for its category.
   */
  public void add(AugmentedContent content) {
    var type = content.getType();
    switch (type) {
      case EmailMetadata:
        EmailMetadata.add((DocumentWithMetadataContent) content);
        break;
      case EmailSearch:
        EmailSearch.add((AugmentedEmailSearch) content);
        break;
      case PolicySearch:
        PolicySearch.add((AugmentedPolicySearch) content);
        break;
      case Attachment:
        Attachments.add((DocumentAttachmentContent) content);
        break;
      default:
        addOtherItem(type, content);
        break;
    }
  }

  /**
   * Adds an "other" type of augmented content to the list.
   * This method is intended to handle content of type {@code AugmentedContentType.OTHER}.
   * Subclasses can override this method to provide specific behavior for handling
   * "other" content types.
   *
   * @param type    The type of the augmented content. Expected to be {@code AugmentedContentType.OTHER}.
   * @param content The augmented content to be added.
   */
  protected void addOtherItem(
    AugmentedContentType type,
    AugmentedContent content
  ) {
    // No specific action needed for other items in this base class.
    Other.add(content);
  }

  /**
   * Retrieves the active document from the list of email metadata.
   *
   * @return The first {@link DocumentWithMetadataContent} object in the list if it exists and is not empty,
   *         otherwise returns {@code null}.
   */
  public DocumentWithMetadataContent getActiveDocumentContent() {
    if (EmailMetadata != null && !EmailMetadata.isEmpty()) {
      return EmailMetadata.get(0);
    }
    return null;
  }

  /**
   * Retrieves the active document along with its associated metadata.
   *
   * @return A {@link DocumentWithMetadata} object representing the active document
   *         and its metadata, or {@code null} if no active document content is available.
   */
  public DocumentWithMetadata getActiveDocument() {
    var content = getActiveDocumentContent();
    return content == null ? null : content.getObject();
  }

  /**
   * Checks if the current object contains email metadata
   *
   * @return {@code true} if the KeyPoints list is not null and not empty,
   *         {@code false} otherwise.
   */
  public Boolean hasEmailMetadata() {
    return EmailMetadata != null && !EmailMetadata.isEmpty();
  }

  /**
   * Checks if the current object contains email search results.
   *
   * @return {@code true} if the KeyPoints list is not null and not empty,
   *         {@code false} otherwise.
   */
  public Boolean hasEmailSearch() {
    return EmailSearch != null && !EmailSearch.isEmpty();
  }

  /**
   * Checks if the current object contains policy search results.
   *
   * @return {@code true} if the KeyPoints list is not null and not empty,
   *         {@code false} otherwise.
   */
  public Boolean hasPolicySearch() {
    return PolicySearch != null && !PolicySearch.isEmpty();
  }

  /**
   * Converts a list of AugmentedJsonObject instances into a JSON array string.
   *
   * @param <T> The type of AugmentedJsonObject, which must extend AugmentedJsonObject<?>.
   * @param jsonObjects The list of AugmentedJsonObject instances to be converted into a JSON array string.
   * @return A string representation of the JSON array containing the JSON objects from the list.
   */
  public <T extends AugmentedJsonObject<?>> String toJsonArray(
    List<T> jsonObjects
  ) {
    StringBuilder jsonArray = new StringBuilder("[");
    for (int i = 0; i < jsonObjects.size(); i++) {
      T jsonObject = jsonObjects.get(i);
      jsonArray.append(jsonObject.getJson());
      if (i < jsonObjects.size() - 1) {
        jsonArray.append(",");
      }
    }
    jsonArray.append("]");
    return jsonArray.toString();
  }

  /**
   * Creates an instance of AugmentedContentList from a given list of Content objects.
   *
   * @param source the list of Content objects to be converted into an AugmentedContentList.
   *               Must not be null.
   * @return an AugmentedContentList containing augmented content derived from the provided source list.
   */
  @SuppressWarnings("unchecked")
  public static <TList extends AugmentedContentListBase> TList from(
    List<Content> source
  ) {
    TList ret;
    try {
      ret = (TList) AugmentedContentListBase.class.getDeclaredConstructor()
        .newInstance();
    } catch (Exception e) {
      throw new RuntimeException("Failed to create an instance of TList", e);
    }
    if (source != null) {
      for (Content content : source) {
        AugmentedContent augmentedContent =
          AugmentedSearchMetadataType.createAugmentedContent(content);
        ret.add(augmentedContent);
      }
    }
    return ret;
  }
}
