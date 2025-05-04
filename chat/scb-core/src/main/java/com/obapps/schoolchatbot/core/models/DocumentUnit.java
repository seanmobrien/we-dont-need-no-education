package com.obapps.schoolchatbot.core.models;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class DocumentUnit {

  public int unitId;
  public String emailId;
  public String attachmentId;
  public String documentPropertyId;
  public int threadId;
  public List<String> relatedEmailIds;
  public String documentType;
  public LocalDateTime createdOn;
  public Integer parentEmailId;
  public String hrefDocument;
  public String hrefApi;
  public String embeddingModel;
  public LocalDateTime embeddedOn;
  public String content;

  public static Builder builder() {
    return new Builder();
  }

  public static Builder builder(String documentType) {
    return new Builder().documentType(documentType);
  }

  public static class Builder {

    private final DocumentUnit instance;

    public Builder() {
      instance = new DocumentUnit();
    }

    public Builder unitId(int unitId) {
      instance.unitId = unitId;
      return this;
    }

    public Builder emailId(String emailId) {
      instance.emailId = emailId;
      return this;
    }

    public Builder attachmentId(Integer attachmentId) {
      return attachmentId == null
        ? this
        : this.attachmentId(attachmentId.toString());
    }

    public Builder attachmentId(String attachmentId) {
      instance.attachmentId = attachmentId;
      return this;
    }

    public Builder documentPropertyId(UUID documentPropertyId) {
      return documentPropertyId == null
        ? this
        : this.documentPropertyId(documentPropertyId.toString());
    }

    public Builder documentPropertyId(String documentPropertyId) {
      instance.documentPropertyId = documentPropertyId;
      return this;
    }

    public Builder threadId(int threadId) {
      instance.threadId = threadId;
      return this;
    }

    public Builder relatedEmailIds(List<String> relatedEmailIds) {
      instance.relatedEmailIds = relatedEmailIds;
      return this;
    }

    public Builder documentType(String documentType) {
      instance.documentType = documentType;
      return this;
    }

    public Builder createdOn(LocalDateTime createdOn) {
      instance.createdOn = createdOn;
      return this;
    }

    public Builder parentEmailId(Integer parentEmailId) {
      instance.parentEmailId = parentEmailId;
      return this;
    }

    public Builder hrefDocument(String hrefDocument) {
      instance.hrefDocument = hrefDocument;
      return this;
    }

    public Builder hrefApi(String hrefApi) {
      instance.hrefApi = hrefApi;
      return this;
    }

    public Builder embeddingModel(String embeddingModel) {
      instance.embeddingModel = embeddingModel;
      return this;
    }

    public Builder embeddedOn(LocalDateTime embeddedOn) {
      instance.embeddedOn = embeddedOn;
      return this;
    }

    public Builder content(String content) {
      instance.content = content;
      return this;
    }

    public DocumentUnit build() {
      return instance;
    }
  }
}
