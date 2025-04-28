package com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two;

import dev.langchain4j.model.output.structured.Description;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

public class CategorizedCallToAction extends InitialCtaOrResponsiveAction {

  @Description(
    "The unique identifier of the 🔔 this record describes.  This should match the recordId of a value provided in the input."
  )
  public String recordId;

  @Description(
    "A rating from 0-10 indicating how well the specific request fits requirements to be related to a Title IX key document or inquiry " +
    "given the facts in this case. A rating of 0 means the request is in no way relevant and no special access to data necessary, a rating " +
    "of 10 means the request is so obviously relevant that no assesor or auditor - including a biased one - could reasonably argue otherwise.  " +
    "A rating of 5 indicates an unbiased auditor or assessor applying best practices would likely find it relevant and eligible for expanded " +
    "data access accorded Title IX's equal access to data mandates, but be open to explanations otherwise."
  )
  public Integer reasonablyTitleIx;

  @Description(
    "A list of reasons why the category is or is not reasonably related to Title IX. These should be specific examples or explanations " +
    "that support the rating given above."
  )
  public List<String> reasonablyTitleIxReasons;

  List<UUID> categories;

  @Description(
    "A list containing IDs of related documents that were identified as linked to this 🔔 during analysis."
  )
  public List<DocumentRelationship> relatedDocuments;

  public static class DocumentRelationship {

    @Description("The ID of the related document.")
    public Integer documentId;

    @Description(
      "How the document is related to this call to action - examples include, but are not limited to, 'supports', 'contradicts', 'refutes', 'provides context', 'suspected violation', etc."
    )
    public String relationshipType;
  }

  // Getters and Setters
  public String getRecordId() {
    return recordId;
  }

  public void setRecordId(String recordId) {
    super.setRecordId(recordId);
    this.recordId = recordId;
  }

  public Integer getReasonablyTitleIx() {
    return reasonablyTitleIx;
  }

  public void setReasonablyTitleIx(Integer reasonablyTitleIx) {
    this.reasonablyTitleIx = reasonablyTitleIx;
  }

  public List<String> getReasonablyTitleIxReasons() {
    return reasonablyTitleIxReasons;
  }

  public void setReasonablyTitleIxReasons(
    List<String> reasonablyTitleIxReasons
  ) {
    this.reasonablyTitleIxReasons = reasonablyTitleIxReasons;
  }

  public List<UUID> getCategories() {
    return categories;
  }

  public void setCategories(List<UUID> categories) {
    this.categories = categories;
  }

  public String getGroupById() {
    // Best case scenario, the recordId is set on us or our parent class.
    var r = this.getRecordId();
    if (r != null && !r.isEmpty()) {
      return r;
    }
    r = super.getRecordId();
    if (r != null && !r.isEmpty()) {
      return r;
    }
    // If we get here, we have no recordId.  Use identifying information from the parent class.
    var looseIdHash = new StringBuilder();
    looseIdHash
      .append(Objects.requireNonNullElse(this.propertyValue, "[null]"))
      .append("|");
    looseIdHash
      .append(Objects.requireNonNullElse(this.documentId, "[null]"))
      .append("|");
    looseIdHash.append(Objects.requireNonNullElse(this.openedDate, "[null]"));
    return looseIdHash.toString();
  }

  public static List<CategorizedCallToAction> deDuplicate(
    List<CategorizedCallToAction> source
  ) {
    var map = new HashMap<String, CategorizedCallToAction>();
    for (CategorizedCallToAction action : source) {
      var hashId = action.getGroupById();
      if (map.containsKey(hashId)) {
        var existingAction = map.get(hashId);
        if (
          action.reasonablyTitleIx != null &&
          action.reasonablyTitleIx >
          Objects.requireNonNullElse(existingAction.reasonablyTitleIx, 0)
        ) {
          existingAction.reasonablyTitleIx = action.reasonablyTitleIx;
        }
        if (
          action.reasonablyTitleIxReasons != null &&
          action.reasonablyTitleIxReasons.size() > 0
        ) {
          if (
            existingAction.reasonablyTitleIxReasons == null ||
            existingAction.reasonablyTitleIxReasons.size() == 0
          ) {
            existingAction.reasonablyTitleIxReasons =
              action.reasonablyTitleIxReasons;
          } else {
            var list = new ArrayList<>(existingAction.reasonablyTitleIxReasons);
            list.addAll(action.reasonablyTitleIxReasons);
            existingAction.reasonablyTitleIxReasons = list
              .stream()
              .distinct()
              .toList();
          }
        }
        if (action.categories != null && !action.categories.isEmpty()) {
          if (
            existingAction.categories == null ||
            existingAction.categories.isEmpty()
          ) {
            existingAction.categories = action.categories;
          } else {
            var list = new ArrayList<>(existingAction.categories);
            list.addAll(action.categories);
            existingAction.categories = list.stream().distinct().toList();
          }
        }

        if (
          action.relatedDocuments != null && !action.relatedDocuments.isEmpty()
        ) {
          if (
            existingAction.relatedDocuments == null ||
            existingAction.relatedDocuments.isEmpty()
          ) {
            existingAction.relatedDocuments = action.relatedDocuments;
          } else {
            var list = new ArrayList<>(existingAction.relatedDocuments);
            list.addAll(action.relatedDocuments);
            existingAction.relatedDocuments = list.stream().distinct().toList();
          }
        }
        continue;
      }
      map.put(hashId, action);
    }
    return new ArrayList<>(map.values());
  }

  public static Builder builder() {
    return new Builder();
  }

  public static class Builder
    extends InitialCtaOrResponsiveAction.Builder<Builder> {

    private String recordId;
    private Integer reasonablyTitleIx;
    private List<String> reasonablyTitleIxReasons;
    private List<UUID> categories;

    public Builder() {
      super();
    }

    @Override
    protected Builder self() {
      return this;
    }

    public Builder reasonablyTitleIx(Integer reasonablyTitleIx) {
      this.reasonablyTitleIx = reasonablyTitleIx;
      return this;
    }

    public Builder reasonablyTitleIxReasons(
      List<String> reasonablyTitleIxReasons
    ) {
      this.reasonablyTitleIxReasons = reasonablyTitleIxReasons;
      return this;
    }

    public Builder categories(List<UUID> categories) {
      this.categories = categories;
      return this;
    }

    @Override
    public Builder recordId(String recordId) {
      super.recordId(recordId);
      this.recordId = recordId;
      return this;
    }

    @Override
    public CategorizedCallToAction build() {
      var ret = new CategorizedCallToAction();
      update(ret);
      return ret;
    }

    @Override
    protected void update(InitialCtaOrResponsiveAction ret) {
      super.update(ret);
      var categorizedCallToAction = (CategorizedCallToAction) ret;
      categorizedCallToAction.reasonablyTitleIx = reasonablyTitleIx;
      categorizedCallToAction.reasonablyTitleIxReasons =
        reasonablyTitleIxReasons;
      categorizedCallToAction.categories = categories;
      categorizedCallToAction.recordId = recordId;
    }

    public Builder copy(CategorizedCallToAction source) {
      super.copy(source)
        .reasonablyTitleIx(source.reasonablyTitleIx)
        .reasonablyTitleIxReasons(source.reasonablyTitleIxReasons)
        .categories(source.categories)
        .recordId(source.recordId);
      return this;
    }
  }
}
