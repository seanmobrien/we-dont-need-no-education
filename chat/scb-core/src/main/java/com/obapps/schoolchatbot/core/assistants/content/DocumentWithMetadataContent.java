package com.obapps.schoolchatbot.core.assistants.content;

import com.obapps.core.util.*;
import com.obapps.schoolchatbot.core.models.DocumentWithMetadata;
import dev.langchain4j.rag.content.Content;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.commons.logging.LogFactory;

/**
 * Represents a document with metadata content, extending the AugmentedJsonObject class.
 */
public class DocumentWithMetadataContent
  extends AugmentedJsonObject<DocumentWithMetadata> {

  /**
   * Constructs a DocumentWithMetadataContent object from a source Content.
   *
   * @param source the source Content object
   */
  public DocumentWithMetadataContent(Content source) {
    super(source, DocumentWithMetadata.class);
  }

  /**
   * Generates a table of document header data based on the provided attachments.
   *
   * @param attachments a list of DocumentAttachmentContent objects
   * @return a formatted string representing the document header data
   */
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
          source.getIsFromDistrictStaff() ? "🧑‍🏫" : "👤"
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

  public String getAbbreviatedDocumentHeaderData(String recordName) {
    var source = getObject();
    if (source == null) {
      LogFactory.getLog(getClass()).warn(
        String.format(
          "DocumentWithMetadataContent: Cannot generate %s header data; object source is null.",
          recordName
        )
      );
    }
    Map<String, Object> table = new HashMap<String, Object>(
      Map.of(
        "Related Document ID",
        source.getDocumentId(),
        "📨 Send Date",
        "📅 " + source.getDocumentSendDate(),
        "📨 Sent By",
        String.format(
          "%s (%s - %s)",
          source.getSender(),
          source.getSenderRole(),
          source.getIsFromDistrictStaff() ? "🧑‍🏫" : "👤"
        ),
        "Subject",
        source.getSubject()
      )
    );
    return Strings.getTable(table, recordName);
  }

  /**
   * Returns the type of augmented content.
   *
   * @return the type of augmented content
   */
  @Override
  public AugmentedContentType getType() {
    return AugmentedContentType.EmailMetadata;
  }

  /**
   * Retrieves the DocumentWithMetadata object from the JSON representation.
   *
   * @return the DocumentWithMetadata object
   */
  @Override
  public DocumentWithMetadata getObject() {
    return super.getObject(DocumentWithMetadata::fromJson);
  }

  /**
   * Generates a prompt text based on the document content.
   *
   * @return a formatted string representing the prompt text
   */
  public String getPromptText() {
    return getPromptText(null);
  }

  /**
   * Generates a prompt text based on the document content.
   *
   * @return a formatted string representing the prompt text
   */
  public String getPromptText(String recordName) {
    var source = getObject();
    if (source == null) {
      LogFactory.getLog(getClass()).warn(
        "DocumentWithMetadataContent: Cannot generate prompt text; object source is null."
      );
    }
    return Strings.getRecordOutput(
      recordName == null ? "📊📄" : recordName,
      source.getContent()
    );
  }

  /**
   * Generates a schema prompt text for metadata.
   *
   * @return a formatted string representing the metadata schema prompt text
   */
  public static String getMetadataSchemaPromptText() {
    return getMetadataSchemaPromptText(null);
  }

  /**
   * Generates a schema prompt text for metadata.
   *
   * @param recordName Text to use as the record name
   * @return a formatted string representing the metadata schema prompt text
   */
  public static String getMetadataSchemaPromptText(String recordName) {
    Map<String, Object> table = Map.of(
      "Document ID",
      "📌 <Unique Document ID> NOTE: Document unique ID",
      "📨 Send Date",
      "📅 <Send Date> NOTE: Use as current date for analysis",
      "📨 Sent By",
      "<Sender Name> (<Sender Role> - <🧑‍🏫=District Staff, 👤=Parent>)",
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
    return Strings.getTable(
      table,
      recordName == null
        ? "📊📄🗂️ (Analysis Target Document Metadata)"
        : recordName
    );
  }

  /**
   * Generates a schema prompt text for metadata.
   *
   * @param recordName Text to use as the record name
   * @return a formatted string representing the metadata schema prompt text
   */
  public static String getAbbreviatedMetadataSchemaPromptText(
    String recordName
  ) {
    Map<String, Object> table = Map.of(
      "Document ID",
      "📌 <Related Document ID> NOTE: This is a ***supporting*** document, ***not*** 📊📄",
      "📨 Send Date",
      "📅 <Send Date>",
      "📨 Sent By",
      "<Sender Name> (<Sender Role> - <🧑‍🏫=District Staff, 👤=Parent>)",
      "Subject",
      "<Subject> NOTE: Subject of the email"
    );
    return Strings.getTable(table, recordName);
  }

  /**
   * Generates a schema prompt text for record content.
   *
   * @return a formatted string representing the record schema prompt text
   */
  public static String getRecordSchemaPromptText() {
    return getRecordSchemaPromptText(null);
  }

  /**
   * Generates a schema prompt text for record content.
   *
   * @param recordName Text to use as the record name, specified when serializing something other than the target document
   * @return a formatted string representing the record schema prompt text
   */
  public static String getRecordSchemaPromptText(String recordName) {
    var note = recordName == null
      ? "NOTE: The content of the document to analyze (📊📄)."
      : "NOTE: This is a ***supporting*** document, ***not*** 📊📄";
    return Strings.getRecordOutput(
      recordName == null ? "📊📄 (Analysis Target Document)" : recordName,
      "<Document Content> " + note
    );
  }
}
