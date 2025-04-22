package com.obapps.schoolchatbot.core.assistants.content;

import com.obapps.schoolchatbot.core.models.EmailAttachment;
import dev.langchain4j.rag.content.Content;

public class DocumentAttachmentContent
  extends AugmentedJsonObject<EmailAttachment> {

  public DocumentAttachmentContent(Content source) {
    super(source, EmailAttachment.class);
  }

  public String getFileName() {
    var fileName = super.meta.getString(
      com.obapps.schoolchatbot.core.assistants.content.AugmentedSearchMetadataType.EmailAttachment.file_name
    );
    if (fileName != null) {
      return fileName;
    }
    var source = getObject();
    if (source == null) {
      return null;
    }
    return source.getFileName();
  }

  public String getDownloadUrl() {
    var downloadUrl = super.meta.getString(
      com.obapps.schoolchatbot.core.assistants.content.AugmentedSearchMetadataType.EmailAttachment.download_url
    );
    if (downloadUrl != null) {
      return downloadUrl;
    }
    var source = getObject();
    if (source == null) {
      return null;
    }
    return source.getFilePath();
  }

  @Override
  public AugmentedContentType getType() {
    return AugmentedContentType.Attachment;
  }
}
