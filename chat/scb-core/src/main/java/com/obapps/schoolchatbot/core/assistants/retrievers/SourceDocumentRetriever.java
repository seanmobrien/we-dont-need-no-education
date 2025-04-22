package com.obapps.schoolchatbot.core.assistants.retrievers;

import com.obapps.schoolchatbot.core.assistants.content.AugmentedSearchMetadataType;
import com.obapps.schoolchatbot.core.models.DocumentWithMetadata;
import com.obapps.schoolchatbot.core.models.EmailAttachment;
import com.obapps.schoolchatbot.core.services.StorageService;
import dev.langchain4j.rag.content.Content;
import dev.langchain4j.rag.query.Query;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

public class SourceDocumentRetriever extends ContentRetrieverBase {

  private final StorageService storageService;

  public SourceDocumentRetriever() {
    this(null);
  }

  public SourceDocumentRetriever(StorageService storageService) {
    super(SourceDocumentRetriever.class);
    this.storageService = storageService == null
      ? new StorageService()
      : storageService;
  }

  @Override
  public List<Content> retrieve(Query query) {
    var ret = new ArrayList<Content>();
    var input = getDocumentId(query);
    if (input.compareTo(1) < 0) {
      // No document id included in query, nothing to do
      ret.add(CreateContent(query.text()));
      return ret;
    }
    try {
      var document = DocumentWithMetadata.fromDb(input);
      if (document != null) {
        ret.add(serializeDocument(document));
        // Then let's check if we have any attachments...
        var attachments = EmailAttachment.loadForEmail(
          null,
          document.getEmailId()
        );
        // And attach downloadable versions of them, if available
        for (var attachment : attachments) {
          ret.add(serializeAttachment(attachment));
        }
      }
    } catch (SQLException e) {
      log.error(
        "An error occurred reading mesage state for document id " + input,
        e
      );
    }
    return ret;
  }

  protected Content serializeAttachment(EmailAttachment attachment) {
    var meta = new HashMap<String, Object>();
    meta.put(
      AugmentedSearchMetadataType.contentType,
      AugmentedSearchMetadataType.EmailAttachment.name
    );
    meta.put(
      AugmentedSearchMetadataType.EmailAttachment.id,
      attachment.getAttachmentId()
    );
    meta.put(
      AugmentedSearchMetadataType.EmailAttachment.email_id,
      attachment.getEmailId()
    );
    meta.put(
      AugmentedSearchMetadataType.EmailAttachment.file_name,
      attachment.getFileName()
    );
    var downloadUrl = storageService.getDownloadUrl(attachment);
    if (downloadUrl != null) {
      attachment.setFilePath(downloadUrl);
      meta.put(
        AugmentedSearchMetadataType.EmailAttachment.download_url,
        downloadUrl
      );
    }
    return CreateContent(attachment.toJson(), meta);
  }

  protected Content serializeDocument(DocumentWithMetadata document) {
    var meta = new HashMap<String, Object>();
    meta.put(
      AugmentedSearchMetadataType.contentType,
      AugmentedSearchMetadataType.EmailMetadata.name
    );
    meta.put(
      AugmentedSearchMetadataType.EmailMetadata.id,
      document.getDocumentId()
    );
    meta.put(
      AugmentedSearchMetadataType.EmailMetadata.type_id,
      document.getDocumentType()
    );
    return CreateContent(document.toJson(), meta);
  }
}
