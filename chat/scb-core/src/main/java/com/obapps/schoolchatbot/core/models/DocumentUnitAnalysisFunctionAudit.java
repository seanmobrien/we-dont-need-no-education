package com.obapps.schoolchatbot.core.models;

import com.obapps.core.util.Db;
import dev.langchain4j.service.tool.ToolExecution;
import java.sql.SQLException;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Represents an audit entry for document unit analysis functions.
 */
public class DocumentUnitAnalysisFunctionAudit {

  /**
   * The ID of the analysis audit this function audit is associated with.
   */
  private Integer analysisAuditId;

  /**
   * The number of the function being audited.
   */
  private Integer functionNum;

  /**
   * The name of the function being audited.
   */
  private String name;

  /**
   * The arguments passed to the function.
   */
  private String arguments;

  /**
   * The result returned by the function.
   */
  private String result;

  /**
   * Gets the ID of the analysis audit.
   * @return the analysis audit ID.
   */
  public Integer getAnalysisAuditId() {
    return analysisAuditId;
  }

  /**
   * Sets the ID of the analysis audit.
   * @param analysisAuditId the analysis audit ID to set.
   */
  public void setAnalysisAuditId(Integer analysisAuditId) {
    this.analysisAuditId = analysisAuditId;
  }

  /**
   * Gets the function number.
   * @return the function number.
   */
  public Integer getFunctionNum() {
    return functionNum;
  }

  /**
   * Sets the function number.
   * @param functionNum the function number to set.
   */
  public void setFunctionNum(Integer functionNum) {
    this.functionNum = functionNum;
  }

  /**
   * Gets the name of the function.
   * @return the function name.
   */
  public String getName() {
    return name;
  }

  /**
   * Sets the name of the function.
   * @param name the function name to set.
   */
  public void setName(String name) {
    this.name = name;
  }

  /**
   * Gets the arguments passed to the function.
   * @return the function arguments.
   */
  public String getArguments() {
    return arguments;
  }

  /**
   * Sets the arguments passed to the function.
   * @param arguments the function arguments to set.
   */
  public void setArguments(String arguments) {
    this.arguments = arguments;
  }

  /**
   * Gets the result returned by the function.
   * @return the function result.
   */
  public String getResult() {
    return result;
  }

  /**
   * Sets the result returned by the function.
   * @param result the function result to set.
   */
  public void setResult(String result) {
    this.result = result;
  }

  /**
   * Builder class for constructing instances of DocumentUnitAnalysisFunctionAudit.
   */
  public static class Builder {

    /**
     * The ID of the analysis audit this function audit is associated with.
     */
    private Integer analysisAuditId;

    /**
     * The number of the function being audited.
     */
    private Integer functionNum;

    /**
     * The name of the function being audited.
     */
    private String name;

    /**
     * The arguments passed to the function.
     */
    private String arguments;

    /**
     * The result returned by the function.
     */
    private String result;

    /**
     * Sets the analysis audit ID.
     * @param analysisAuditId the analysis audit ID to set.
     * @return the Builder instance.
     */
    public Builder analysisAuditId(Integer analysisAuditId) {
      this.analysisAuditId = analysisAuditId;
      return this;
    }

    /**
     * Sets the function number.
     * @param functionNum the function number to set.
     * @return the Builder instance.
     */
    public Builder functionNum(Integer functionNum) {
      this.functionNum = functionNum;
      return this;
    }

    /**
     * Sets the function name.
     * @param name the function name to set.
     * @return the Builder instance.
     */
    public Builder name(String name) {
      this.name = name;
      return this;
    }

    /**
     * Sets the function arguments.
     * @param arguments the function arguments to set.
     * @return the Builder instance.
     */
    public Builder arguments(String arguments) {
      this.arguments = arguments;
      return this;
    }

    /**
     * Sets the tool execution details for the builder.
     *
     * @param function The ToolExecution instance containing the request and result details.
     * @return The Builder instance with updated name, arguments, and result based on the provided ToolExecution.
     */
    public Builder tool(ToolExecution function) {
      var request = function.request();
      return this.name(request.name())
        .arguments(request.arguments())
        .result(function.result());
    }

    /**
     * Sets the function result.
     * @param result the function result to set.
     * @return the Builder instance.
     */
    public Builder result(String result) {
      this.result = result;
      return this;
    }

    /**
     * Builds and returns a DocumentUnitAnalysisFunctionAudit instance.
     * @return the constructed DocumentUnitAnalysisFunctionAudit instance.
     */
    public DocumentUnitAnalysisFunctionAudit build() {
      DocumentUnitAnalysisFunctionAudit audit =
        new DocumentUnitAnalysisFunctionAudit();
      audit.setAnalysisAuditId(analysisAuditId);
      audit.setFunctionNum(functionNum);
      audit.setName(name);
      audit.setArguments(arguments);
      audit.setResult(result);
      return audit;
    }
  }

  /**
   * Creates a new Builder instance for constructing DocumentUnitAnalysisFunctionAudit objects.
   * @return a new Builder instance.
   */
  public static Builder builder() {
    return new Builder();
  }

  /**
   * Saves this audit entry to the database.
   * @param db the database instance to use.
   * @throws SQLException if a database error occurs.
   */
  public void saveToDb(Db db) throws SQLException {
    var res = db.executeUpdate(
      "INSERT INTO document_unit_analysis_function_audit (analysis_audit_id, function_num, name, arguments, result) VALUES (?, ?, ?, ?, ?)",
      analysisAuditId,
      functionNum,
      name,
      arguments,
      result
    );
    if (res == null) {
      throw new SQLException(
        "Failed to insert DocumentUnitAnalysisFunctionAudit"
      );
    }
  }

  /**
   * Updates this audit entry in the database.
   * @param db the database instance to use.
   * @throws SQLException if a database error occurs.
   */
  public void updateDb(Db db) throws SQLException {
    if (analysisAuditId == null || functionNum == null) {
      throw new SQLException(
        "Cannot update record without analysisAuditId and functionNum"
      );
    }
    db.executeUpdate(
      "UPDATE document_unit_analysis_function_audit SET name = ?, arguments = ?, result = ? WHERE analysis_audit_id = ? AND function_num = ?",
      name,
      arguments,
      result,
      analysisAuditId,
      functionNum
    );
  }

  /**
   * Loads a DocumentUnitAnalysisFunctionAudit entry from the database.
   * @param db the database instance to use.
   * @param analysisAuditId the analysis audit ID to filter by.
   * @param functionNum the function number to filter by.
   * @return the loaded DocumentUnitAnalysisFunctionAudit instance, or null if not found.
   * @throws SQLException if a database error occurs.
   */
  public static DocumentUnitAnalysisFunctionAudit loadFromDb(
    Db db,
    Integer analysisAuditId,
    Integer functionNum
  ) throws SQLException {
    var records = db.selectObjects(
      DocumentUnitAnalysisFunctionAudit.class,
      "SELECT * FROM document_unit_analysis_function_audit WHERE analysis_audit_id = ? AND function_num = ?",
      analysisAuditId,
      functionNum
    );
    return records.isEmpty() ? null : records.get(0);
  }

  /**
   * Converts a list of ToolExecution objects into a list of DocumentUnitAnalysisFunctionAudit objects.
   *
   * @param tools the list of ToolExecution objects to be converted
   * @return a list of DocumentUnitAnalysisFunctionAudit objects created from the provided ToolExecution objects
   */
  public static List<DocumentUnitAnalysisFunctionAudit> from(
    List<ToolExecution> tools
  ) {
    return tools
      .stream()
      .map(c -> DocumentUnitAnalysisFunctionAudit.builder().tool(c).build())
      .collect(Collectors.toList());
  }
}
