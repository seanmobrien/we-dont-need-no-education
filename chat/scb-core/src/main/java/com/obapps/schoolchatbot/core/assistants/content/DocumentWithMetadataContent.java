package com.obapps.schoolchatbot.core.assistants.content;

import com.obapps.core.util.*;
import com.obapps.schoolchatbot.core.assistants.retrievers.ContentRetrieverBase;
import com.obapps.schoolchatbot.core.models.DocumentWithMetadata;
import dev.langchain4j.rag.content.Content;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.commons.logging.LogFactory;

public class DocumentWithMetadataContent
  extends AugmentedJsonObject<DocumentWithMetadata> {

  public DocumentWithMetadataContent(Content source) {
    super(copy(source), DocumentWithMetadata.class);
  }

  private static Content copy(Content source) {
    var text = source.textSegment().text();
    if (text != null && !text.isEmpty()) {
      return Content.from(
        dev.langchain4j.data.segment.TextSegment.from(
          source.textSegment().text(),
          source.textSegment().metadata()
        ),
        source.metadata()
      );
    }
    return source;
  }

  public String getDocumentHeaderData(
    List<DocumentAttachmentContent> attachments
  ) {
    var source = getObject();
    if (source == null) {
      LogFactory.getLog(getClass()).warn(
        "DocumentWithMetadataContent: Cannot generate header data; object source is null."
      );
    }
    Map<String, Object> table = new HashMap<String, Object>(
      Map.of(
        "Document ID",
        "📌 " + source.getDocumentId(),
        "📨 Send Date",
        "📅 " + source.getDocumentSendDate(),
        "📨 Sent By",
        String.format(
          "%s (%s - %s)",
          source.getSender(),
          source.getSenderRole(),
          source.getIsFromDistrictStaff() ? "🧑‍🏫 District Staff" : "👤 Parent"
        ),
        "Subject",
        source.getSubject(),
        "Thread ID",
        "📌 " + source.getThreadId()
      )
    );
    if (source.getReplyToDocumentId() != null) {
      table.put("Reply To Id", "📩 " + source.getReplyToDocumentId());
    }
    if (
      source.getRelatedDocuments() != null &&
      source.getRelatedDocuments().size() > 0
    ) {
      var relDocString = new StringBuilder();
      source
        .getRelatedDocuments()
        .forEach(s -> relDocString.append(s).append(", "));
      table.put(
        "Related Documents",
        "📎 " + relDocString.substring(0, relDocString.length() - 2)
      );
    }
    if (attachments != null && attachments.size() > 0) {
      for (var idx = 0; idx < attachments.size(); idx++) {
        var attachment = attachments.get(idx);
        var attachmentKey = "Attachment " + (idx + 1);
        var attachmentValue = String.format(
          "[%s] 🔗 %s",
          attachment.getFileName(),
          attachment.getDownloadUrl()
        );
        table.put(attachmentKey, attachmentValue);
      }
    }
    return Strings.getTable(table, "📊📄Target Document 🗂️ Metadata");
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
    return Strings.getRecordOutput("📊📄", source.getContent());
  }

  public static String getMetadataSchemaPromptText() {
    Map<String, Object> table = Map.of(
      "Document ID",
      "📌 <Unique Document ID> NOTE: Document unique ID",
      "📨 Send Date",
      "📅 <Send Date> NOTE: Use as current date for analysis",
      "📨 Sent By",
      "<Sender Name> (<Sender Role> - <Is District Staff?>)",
      "Subject",
      "<Subject> NOTE: Subject of the email",
      "Thread ID",
      "📌 <Thread ID> NOTE: The email Thread ID containing this document.",
      "Reply To Id",
      "📩 <Reply To Document ID> NOTE: The email this is a reply to.",
      "Related Documents",
      "📎 <Related Document IDs> NOTE: Comma-delimited list of related document IDs.",
      "Attachment <n>",
      "📎 <Attachment File Name> 🔗 <Attachment Download URL> NOTE: The attachment can be downloaded at this url if needed."
    );
    return Strings.getTable(table, "📊📄🗂️");
  }

  public static String getRecordSchemaPromptText() {
    return Strings.getRecordOutput(
      "📊📄",
      "<Document Content> NOTE: The content of the document to analyze."
    );
  }
}
