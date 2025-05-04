package com.obapps.schoolchatbot.core.assistants.content;

import com.obapps.schoolchatbot.core.assistants.types.ContentAugmentorFactory;
import dev.langchain4j.data.document.Document;
import dev.langchain4j.model.output.structured.Description;
import dev.langchain4j.rag.content.Content;
import java.util.HashMap;
import org.slf4j.LoggerFactory;

public class AugmentedSearchMetadataType {

  public static final String contentType = "content_augment";

  public static class KeyPoint {

    public static final String name = "KeyPoint";
    public static final String id = "property_id";
    public static final String document_id = "document_id";
    public static final String policy_dscr = "policy_description";
    public static final String compliance = "compliance_rating";
    public static final String tags = "tags";
    public static final String current_document = "current_document";
  }

  public static class EmailMetadata {

    public static final String name = "EmailMetadata";
    public static final String id = "document_id";
    public static final String type_id = "document_type_id";
  }

  public static class EmailAttachment {

    public static final String name = "EmailAttachment";
    public static final String doctype_email = "email";
    public static final String email_id = "email_id";
    public static final String doctype_attachment = "attachment";
    public static final String id = "attachment_id";
    public static final String file_name = "file_name";
    public static final String download_url = "download_url";
    public static final String size = "size";
  }

  public static class Search {

    public static final String filename = Document.FILE_NAME;
  }

  public static class EmailSearch {

    public static final String id = "email_id";
    public static final String parent_email_id = "parent_email_id";
    public static final String attachment_id = "attachment_id";

    @Deprecated
    @Description("Deprecated, use document_property_id instead")
    public static final String email_property_id = "email_property_id";

    public static final String document_property_id = "document_property_id";

    public static final String thread_id = "thread_id";
    public static final String relatedEmailIds = "relatedEmailIds";
    public static final String document_type = "document_type";
    public static final String created_on = "created_on";
    public static final String href_document = "href_document";
    public static final String href_api = "href_api";
  }

  public static class PolicySearch {

    public static final String id = "policy_id";
    public static final String chapter = "policy_chapter";
  }

  public static class CallToAction {

    public static final String name = "CallToAction";
    public static final String id = "id";
    public static final String document_id = "document_id";
    public static final String policy_dscr = "policy_dscr";
    public static final String tags = "tags";
    public static final String completion_percentage = "completion_percentage";
    public static final String current_document = "current_document";
  }

  private static HashMap<
    AugmentedContentType,
    ContentAugmentorFactory<AugmentedContent>
  > getAugmentorFactories() {
    if (augmentorFactories == null) {
      augmentorFactories = new HashMap<
        AugmentedContentType,
        ContentAugmentorFactory<AugmentedContent>
      >();
      augmentorFactories.put(AugmentedContentType.EmailSearch, content ->
        new AugmentedEmailSearch(content)
      );
      augmentorFactories.put(AugmentedContentType.PolicySearch, content ->
        new AugmentedPolicySearch(content)
      );
      augmentorFactories.put(AugmentedContentType.EmailMetadata, content ->
        new DocumentWithMetadataContent(content)
      );
      augmentorFactories.put(AugmentedContentType.Attachment, content ->
        new DocumentAttachmentContent(content)
      );
    }
    if (augmentorFactories == null) {
      throw new IllegalArgumentException("No way we should get here");
      /*
    augmentorFactories = new HashMap<>();
      augmentorFactories.put(AugmentedContentType.EmailSearch, content ->
        new AugmentedEmailSearch(content)
      );
      augmentorFactories.put(AugmentedContentType.PolicySearch, content ->
        new AugmentedPolicySearch(content)
      );
    */
    }
    return augmentorFactories;
  }

  private static HashMap<
    AugmentedContentType,
    ContentAugmentorFactory<AugmentedContent>
  > augmentorFactories = null;

  public static ContentAugmentorFactory<
    ? extends AugmentedContent
  > addAugmentorFactory(
    AugmentedContentType type,
    ContentAugmentorFactory<AugmentedContent> factory
  ) {
    if (type == null || factory == null) {
      throw new IllegalArgumentException("type and factory cannot be null");
    }
    var factories = getAugmentorFactories();
    var current = factories.get(type);
    // Remove current factory if it exists
    if (current != null) {
      factories.remove(type);
    }
    factories.put(type, factory);
    return current;
  }

  @SuppressWarnings("unchecked")
  public static <R extends AugmentedContent> R createAugmentedContent(
    Content source
  ) {
    if (source == null) {
      throw new IllegalArgumentException("source cannot be null");
    }
    var type = AugmentedContent.getAugmentedType(source);
    var factory = getAugmentorFactories().get(type);
    if (factory != null) {
      return (R) factory.apply(source);
    }
    if (type == AugmentedContentType.Unknown) {
      LoggerFactory.getLogger(AugmentedSearchMetadataType.class).warn(
        "No factory found for type: " + type
      );
    }
    return (R) new GenericAugmentedContent(source);
  }
}
