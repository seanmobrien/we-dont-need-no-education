package com.obapps.schoolchatbot.core.models;

import com.obapps.core.util.DateTimeFormats;
import com.obapps.core.util.Strings;
import dev.langchain4j.data.document.Document;
import dev.langchain4j.data.document.Metadata;
import java.time.LocalDateTime;
import java.util.HashMap;

public class SchoolDocument implements Document {

  private DocumentUnit source;
  private String content;
  private Metadata metadata;

  public SchoolDocument(DocumentUnit source) {
    if (source == null) {
      throw new IllegalArgumentException("source cannot be null");
    }
    this.source = source;
    if (source.unitId <= 0) {
      throw new IllegalArgumentException("unitId must be a positive integer");
    }
    this.content = source.content;
    var meta = new HashMap<String, Object>();
    meta.put("id", source.unitId);
    meta.put("email_id", source.emailId);
    if (source.parentEmailId != null && source.parentEmailId > 0) {
      meta.put("parent_email_id", source.parentEmailId);
    }
    if (source.attachmentId != null) {
      meta.put("attachment_id", source.attachmentId);
    }
    if (source.documentPropertyId != null) {
      meta.put("document_property_id", source.documentPropertyId);
    }
    meta.put("thread_id", source.threadId);

    meta.put("relatedEmailIds", String.join(",", source.relatedEmailIds));
    meta.put("document_type", source.documentType);
    meta.put("created_on", DateTimeFormats.localTime.format(source.createdOn));
    meta.put(
      "embedded_on",
      DateTimeFormats.localTime.format(LocalDateTime.now())
    );

    meta.put("href_document", source.hrefDocument);
    meta.put("href_api", source.hrefApi);

    this.metadata = new Metadata(meta);
  }

  public String id() {
    return this.metadata.getString("id");
  }

  @Override
  public String text() {
    switch (this.source.documentType) {
      case "cta":
        return Strings.normalizeForOutput(
          String.format(
            """
            🔔 ID: %s
            🏷️ %s
            """,
            this.source.documentPropertyId,
            this.source.content
          )
        );
      default:
        return Strings.normalizeForOutput(content);
    }
  }

  @Override
  public Metadata metadata() {
    return metadata;
  }
}
