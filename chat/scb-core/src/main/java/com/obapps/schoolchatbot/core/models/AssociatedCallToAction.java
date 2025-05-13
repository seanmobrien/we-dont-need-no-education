package com.obapps.schoolchatbot.core.models;

import com.obapps.core.util.IDbTransaction;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public class AssociatedCallToAction {

  public UUID callToActionId;
  public Double complianceChapter13;
  public List<String> complianceChapter13Reasons;
  public Double completionPercentage;
  public List<String> completionPercentageReasons;

  public AssociatedCallToAction(
    UUID callToActionId,
    Double complianceChapter13,
    List<String> complianceChapter13Reasons,
    Double completionPercentage,
    List<String> completionPercentageReasons
  ) {
    this.callToActionId = callToActionId;
    this.complianceChapter13 = complianceChapter13;
    this.complianceChapter13Reasons = complianceChapter13Reasons;
    this.completionPercentage = completionPercentage;
    this.completionPercentageReasons = completionPercentageReasons;
  }

  public UUID getCallToActionId() {
    return callToActionId;
  }

  public void setCallToActionId(UUID callToActionId) {
    this.callToActionId = callToActionId;
  }

  public Double getComplianceChapter13() {
    return complianceChapter13;
  }

  public void setComplianceChapter13(Double complianceChapter13) {
    this.complianceChapter13 = complianceChapter13;
  }

  public List<String> getComplianceChapter13Reasons() {
    return complianceChapter13Reasons;
  }

  public void setComplianceChapter13Reasons(
    List<String> complianceChapter13Reasons
  ) {
    this.complianceChapter13Reasons = complianceChapter13Reasons;
  }

  public Double getCompletionPercentage() {
    return completionPercentage;
  }

  public void setCompletionPercentage(Double completionPercentage) {
    this.completionPercentage = completionPercentage;
  }

  public List<String> getCompletionPercentageReasons() {
    return completionPercentageReasons;
  }

  public void setCompletionPercentageReasons(
    List<String> completionPercentageReasons
  ) {
    this.completionPercentageReasons = completionPercentageReasons;
  }

  public Boolean addToDb(IDbTransaction tx, UUID responsiveActionId)
    throws SQLException {
    var updated = tx
      .getDb()
      .executeUpdate(
        "INSERT INTO call_to_action_details_call_to_action_response " +
        "(call_to_action_id, call_to_action_response_id, compliance_chapter_13, " +
        "compliance_chapter_13_reasons, completion_percentage, completion_percentage_reasons) " +
        "VALUES (?, ?, ?, ?, ?, ?)",
        getCallToActionId(),
        responsiveActionId,
        getComplianceChapter13(),
        getComplianceChapter13Reasons(),
        getCompletionPercentage(),
        getCompletionPercentageReasons()
      );
    return updated > 0;
  }

  public Boolean updateDb(IDbTransaction tx, UUID responsiveActionId)
    throws SQLException {
    var updated = tx
      .getDb()
      .executeUpdate(
        "UPDATE call_to_action_details_call_to_action_response " +
        "SET compliance_chapter_13 = ?, compliance_chapter_13_reasons = ?, completion_percentage = ?, completion_percentage_reasons = ? " +
        "WHERE call_to_action_id = ? AND call_to_action_response_id = ?",
        getComplianceChapter13(),
        getComplianceChapter13Reasons(),
        getCompletionPercentage(),
        getCompletionPercentageReasons(),
        getCallToActionId(),
        responsiveActionId
      );
    if (updated == 0) {
      return addToDb(tx, responsiveActionId);
    }
    return true;
  }

  public static Builder builder() {
    return new Builder();
  }

  public static class Builder {

    private UUID callToActionId;
    private Double complianceChapter13;
    private List<String> complianceChapter13Reasons;
    private Double completionPercentage;
    private List<String> completionPercentageReasons;

    public Builder callToActionId(UUID callToActionId) {
      this.callToActionId = callToActionId;
      return this;
    }

    public Builder callToActionId(IDbTransaction tx, String callToActionId) {
      try {
        this.callToActionId = UUID.fromString(callToActionId);
      } catch (IllegalArgumentException e) {
        try {
          var asDocumentId = Integer.parseInt(callToActionId);
          Optional<UUID> propId = tx
            .getDb()
            .selectSingleValue(
              "SELECT document_property_id FROM document_units WHERE unit_id=?",
              asDocumentId
            );
          if (propId == null || !propId.isPresent()) {
            throw new IllegalArgumentException(
              "Invalid document property ID: " + callToActionId
            );
          }
          this.callToActionId = propId.get();
        } catch (NumberFormatException ex) {
          // Handle the exception if the string is not a valid UUID
          throw new IllegalArgumentException(
            "Invalid UUID string: " + callToActionId,
            ex
          );
        }
      }
      return this;
    }

    public Builder complianceChapter13(Double complianceChapter13) {
      this.complianceChapter13 = complianceChapter13;
      return this;
    }

    public Builder complianceChapter13Reasons(
      List<String> complianceChapter13Reasons
    ) {
      this.complianceChapter13Reasons = complianceChapter13Reasons;
      return this;
    }

    public Builder completionPercentage(Double completionPercentage) {
      this.completionPercentage = completionPercentage;
      return this;
    }

    public Builder completionPercentageReasons(
      List<String> completionPercentageReasons
    ) {
      this.completionPercentageReasons = completionPercentageReasons;
      return this;
    }

    public AssociatedCallToAction build() {
      return new AssociatedCallToAction(
        callToActionId,
        complianceChapter13,
        complianceChapter13Reasons,
        completionPercentage,
        completionPercentageReasons
      );
    }
  }
}
