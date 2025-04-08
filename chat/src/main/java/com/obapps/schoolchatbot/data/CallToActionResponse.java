package com.obapps.schoolchatbot.data;

import com.obapps.schoolchatbot.util.Db;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

public class CallToActionResponse extends DocumentProperty {

  private UUID actionPropertyId;
  private Double completionPercentage = 0.0;
  private LocalDateTime responseTimestamp;
  private Double complianceMessage;
  private String complianceMessageReasons;
  private Double complianceAggregate;
  private String complianceAggregateReasons;

  public CallToActionResponse() {
    super();
    setPropertyType(DocumentPropertyType.KnownValues.CallToActionResponse);
  }

  public CallToActionResponse(Map<String, Object> stateBag) {
    super(stateBag);
    setPropertyType(DocumentPropertyType.KnownValues.CallToActionResponse);
    Db.saveUuidFromStateBag(
      stateBag,
      "action_property_id",
      this::setActionPropertyId
    );
    Db.saveDoubleFromStateBag(
      stateBag,
      "completion_percentage",
      this::setCompletionPercentage
    );
    Db.saveLocalDateTimeFromStateBag(
      stateBag,
      "response_timestamp",
      this::setResponseTimestamp
    );
    Db.saveDoubleFromStateBag(
      stateBag,
      "compliance_message",
      this::setComplianceMessage
    );
    Db.saveFromStateBag(
      stateBag,
      "compliance_message_reasons",
      this::setComplianceMessageReasons
    );
    Db.saveDoubleFromStateBag(
      stateBag,
      "compliance_aggregate",
      this::setComplianceAggregate
    );
    Db.saveFromStateBag(
      stateBag,
      "compliance_aggregate_reasons",
      this::setComplianceAggregateReasons
    );
  }

  public UUID getActionPropertyId() {
    return actionPropertyId;
  }

  public void setActionPropertyId(UUID actionPropertyId) {
    this.actionPropertyId = actionPropertyId;
  }

  public Double getCompletionPercentage() {
    return completionPercentage;
  }

  public void setCompletionPercentage(Double completionPercentage) {
    this.completionPercentage = completionPercentage;
  }

  public LocalDateTime getResponseTimestamp() {
    return responseTimestamp;
  }

  public void setResponseTimestamp(LocalDateTime responseTimestamp) {
    this.responseTimestamp = responseTimestamp;
  }

  public Double getComplianceMessage() {
    return complianceMessage;
  }

  public void setComplianceMessage(Double complianceMessage) {
    this.complianceMessage = complianceMessage;
  }

  public String getComplianceMessageReasons() {
    return complianceMessageReasons;
  }

  public void setComplianceMessageReasons(String complianceMessageReasons) {
    this.complianceMessageReasons = complianceMessageReasons;
  }

  public Double getComplianceAggregate() {
    return complianceAggregate;
  }

  public void setComplianceAggregate(Double complianceAggregate) {
    this.complianceAggregate = complianceAggregate;
  }

  public String getComplianceAggregateReasons() {
    return complianceAggregateReasons;
  }

  public void setComplianceAggregateReasons(String complianceAggregateReasons) {
    this.complianceAggregateReasons = complianceAggregateReasons;
  }

  @SuppressWarnings("unchecked")
  @Override
  public CallToActionResponse addToDb(Db db) throws SQLException {
    super.addToDb(db);
    db.executeUpdate(
      "INSERT INTO call_to_action_response_details " +
      "(property_id, action_property_id, completion_percentage, response_timestamp, compliance_message, compliance_message_reasons, compliance_aggregate, compliance_aggregate_reasons) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      getPropertyId(),
      actionPropertyId,
      completionPercentage,
      responseTimestamp,
      complianceMessage,
      complianceMessageReasons,
      complianceAggregate,
      complianceAggregateReasons
    );
    return this;
  }

  public static class CallToActionResponseBuilder
    extends DocumentPropertyBuilderBase<
      CallToActionResponse,
      CallToActionResponseBuilder
    > {

    protected CallToActionResponseBuilder() {
      super(new CallToActionResponse());
    }

    public CallToActionResponseBuilder actionPropertyId(UUID actionPropertyId) {
      target.setActionPropertyId(actionPropertyId);
      return self();
    }

    public CallToActionResponseBuilder completionPercentage(
      Double completionPercentage
    ) {
      target.setCompletionPercentage(completionPercentage);
      return self();
    }

    public CallToActionResponseBuilder responseTimestamp(
      LocalDateTime responseTimestamp
    ) {
      target.setResponseTimestamp(responseTimestamp);
      return self();
    }

    public CallToActionResponseBuilder complianceMessage(
      Double complianceMessage
    ) {
      target.setComplianceMessage(complianceMessage);
      return self();
    }

    public CallToActionResponseBuilder complianceMessageReasons(
      String complianceMessageReasons
    ) {
      target.setComplianceMessageReasons(complianceMessageReasons);
      return self();
    }

    public CallToActionResponseBuilder complianceAggregate(
      Double complianceAggregate
    ) {
      target.setComplianceAggregate(complianceAggregate);
      return self();
    }

    public CallToActionResponseBuilder complianceAggregateReasons(
      String complianceAggregateReasons
    ) {
      target.setComplianceAggregateReasons(complianceAggregateReasons);
      return self();
    }
  }

  public static CallToActionResponseBuilder builder() {
    return new CallToActionResponseBuilder();
  }
}
