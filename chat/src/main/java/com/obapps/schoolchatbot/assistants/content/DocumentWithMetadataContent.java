package com.obapps.schoolchatbot.assistants.content;

import com.obapps.schoolchatbot.data.DocumentWithMetadata;
import com.obapps.schoolchatbot.util.Strings;
import dev.langchain4j.rag.content.Content;
import java.util.Map;
import org.apache.commons.logging.LogFactory;

public class DocumentWithMetadataContent
  extends AugmentedJsonObject<DocumentWithMetadata> {

  public DocumentWithMetadataContent(Content source) {
    super(source, DocumentWithMetadata.class);
  }

  @Override
  public AugmentedContentType getType() {
    return AugmentedContentType.EmailMetadata;
  }

  @Override
  public DocumentWithMetadata getObject() {
    return super.getObject(DocumentWithMetadata::fromJson);
  }

  public String getPromptText() {
    var source = getObject();
    if (source == null) {
      LogFactory.getLog(getClass()).warn(
        "DocumentWithMetadataContent: Cannot generate prompt text; object source is null."
      );
    }
    Map<String, Object> metadata = Map.of(
      "document_id",
      source.getDocumentId(),
      "send_date",
      source.getDocumentSendDate(),
      "document_type",
      source.getDocumentType(),
      "is_from_parent",
      source.getIsFromParent(),
      "sender",
      source.getSender(),
      "recipients",
      source.getRecipients(),
      "subject",
      source.getSubject(),
      "thread_id",
      source.getThreadId(),
      "email_id",
      source.getEmailId()
    );
    return Strings.getRecordOutput(
      "Analysis Target Document",
      source.getContent(),
      metadata
    );
  }
}
