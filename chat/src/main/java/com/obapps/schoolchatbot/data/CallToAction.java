package com.obapps.schoolchatbot.data;

import com.obapps.schoolchatbot.util.Db;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.Map;

public class CallToAction extends DocumentProperty {

  private LocalDate openedDate;
  private LocalDate closedDate;
  private LocalDate compliancyCloseDate;
  private Double completionPercentage = 0.0;
  private Integer policyId;
  private Double complianceMessage = 100.0;
  private String complianceMessageReasons;

  public CallToAction() {
    super();
  }

  public CallToAction(Map<String, Object> stateBag) {
    super(stateBag);
    Db.saveLocalDateFromStateBag(stateBag, "opened_date", this::setOpenedDate);
    Db.saveLocalDateFromStateBag(stateBag, "closed_date", this::setClosedDate);
    Db.saveLocalDateFromStateBag(
      stateBag,
      "compliancy_close_date",
      this::setCompliancyCloseDate
    );
    Db.saveDoubleFromStateBag(
      stateBag,
      "completion_percentage",
      this::setCompletionPercentage
    );
    Db.saveIntFromStateBag(stateBag, "policy_id", this::setPolicyId);
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
  }

  public LocalDate getOpenedDate() {
    return openedDate;
  }

  public void setOpenedDate(LocalDate openedDate) {
    this.openedDate = openedDate;
  }

  public LocalDate getClosedDate() {
    return closedDate;
  }

  public void setClosedDate(LocalDate closedDate) {
    this.closedDate = closedDate;
  }

  public LocalDate getCompliancyCloseDate() {
    return compliancyCloseDate;
  }

  public void setCompliancyCloseDate(LocalDate compliancyCloseDate) {
    this.compliancyCloseDate = compliancyCloseDate;
  }

  public Double getCompletionPercentage() {
    return completionPercentage;
  }

  public void setCompletionPercentage(Double completionPercentage) {
    this.completionPercentage = completionPercentage;
  }

  public Integer getPolicyId() {
    return policyId;
  }

  public void setPolicyId(Integer policyId) {
    this.policyId = policyId;
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

  @SuppressWarnings("unchecked")
  @Override
  public CallToAction addToDb() throws SQLException {
    return addToDb(Db.getInstance());
  }

  @SuppressWarnings("unchecked")
  @Override
  public CallToAction addToDb(Db db) throws SQLException {
    super.addToDb(db);
    db.executeUpdate(
      "INSERT INTO call_to_action_details " +
      "(property_id, opened_date, closed_date, compliancy_close_date, completion_percentage, policy_id, compliance_message, compliance_message_reasons) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      getPropertyId(),
      openedDate,
      closedDate,
      compliancyCloseDate,
      completionPercentage,
      policyId < 1 ? null : policyId,
      complianceMessage,
      complianceMessageReasons
    );
    return this;
  }

  public static class CallToActionBuilder
    extends DocumentPropertyBuilderBase<CallToAction, CallToActionBuilder> {

    protected CallToActionBuilder() {
      super(new CallToAction());
    }

    public CallToActionBuilder openedDate(LocalDate openedDate) {
      target.setOpenedDate(openedDate);
      return self();
    }

    public CallToActionBuilder closedDate(LocalDate closedDate) {
      target.setClosedDate(closedDate);
      return self();
    }

    public CallToActionBuilder compliancyCloseDate(
      LocalDate compliancyCloseDate
    ) {
      target.setCompliancyCloseDate(compliancyCloseDate);
      return self();
    }

    public CallToActionBuilder completionPercentage(
      Double completionPercentage
    ) {
      target.setCompletionPercentage(completionPercentage);
      return self();
    }

    public CallToActionBuilder policyId(Integer policyId) {
      target.setPolicyId(policyId);
      return self();
    }

    public CallToActionBuilder complianceMessage(Double complianceMessage) {
      target.setComplianceMessage(complianceMessage);
      return self();
    }

    public CallToActionBuilder complianceMessageReasons(
      String complianceMessageReasons
    ) {
      target.setComplianceMessageReasons(complianceMessageReasons);
      return self();
    }
  }

  public static CallToActionBuilder builder() {
    return new CallToActionBuilder();
  }
}
