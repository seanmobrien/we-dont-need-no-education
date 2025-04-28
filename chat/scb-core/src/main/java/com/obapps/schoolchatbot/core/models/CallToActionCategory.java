package com.obapps.schoolchatbot.core.models;

import com.obapps.core.util.Db;
import java.sql.SQLException;
import java.util.List;
import java.util.UUID;

/**
 * Represents a category of calls to action.
 */
public class CallToActionCategory {

  /**
   * The unique identifier for the call to action category.
   */
  private UUID ctaCategoryId;

  /**
   * The name of the call to action category.
   */
  private String categoryName;

  /**
   * A description of the call to action category.
   */
  private String categoryDescription;

  /**
   * The text embedding vector for the call to action category.
   */
  private float[] ctaCategoryTextEmbedding;

  /**
   * The model used to generate the text embedding.
   */
  private String ctaCategoryTextEmbeddingModel;

  // Getters and Setters

  /**
   * Gets the unique identifier for the call to action category.
   * @return The UUID of the category.
   */
  public UUID getCtaCategoryId() {
    return ctaCategoryId;
  }

  /**
   * Sets the unique identifier for the call to action category.
   * @param ctaCategoryId The UUID to set.
   */
  public void setCtaCategoryId(UUID ctaCategoryId) {
    this.ctaCategoryId = ctaCategoryId;
  }

  /**
   * Gets the name of the call to action category.
   * @return The name of the category.
   */
  public String getCategoryName() {
    return categoryName;
  }

  /**
   * Sets the name of the call to action category.
   * @param categoryName The name to set.
   */
  public void setCategoryName(String categoryName) {
    this.categoryName = categoryName;
  }

  /**
   * Gets the description of the call to action category.
   * @return The description of the category.
   */
  public String getCategoryDescription() {
    return categoryDescription;
  }

  /**
   * Sets the description of the call to action category.
   * @param categoryDescription The description to set.
   */
  public void setCategoryDescription(String categoryDescription) {
    this.categoryDescription = categoryDescription;
  }

  /**
   * Gets the text embedding vector for the call to action category.
   * @return The text embedding vector.
   */
  public float[] getCtaCategoryTextEmbedding() {
    return ctaCategoryTextEmbedding;
  }

  /**
   * Sets the text embedding vector for the call to action category.
   * @param ctaCategoryTextEmbedding The text embedding vector to set.
   */
  public void setCtaCategoryTextEmbedding(float[] ctaCategoryTextEmbedding) {
    this.ctaCategoryTextEmbedding = ctaCategoryTextEmbedding;
  }

  /**
   * Gets the model used to generate the text embedding.
   * @return The model name.
   */
  public String getCtaCategoryTextEmbeddingModel() {
    return ctaCategoryTextEmbeddingModel;
  }

  /**
   * Sets the model used to generate the text embedding.
   * @param ctaCategoryTextEmbeddingModel The model name to set.
   */
  public void setCtaCategoryTextEmbeddingModel(
    String ctaCategoryTextEmbeddingModel
  ) {
    this.ctaCategoryTextEmbeddingModel = ctaCategoryTextEmbeddingModel;
  }

  public static Builder builder() {
    return new Builder();
  }

  /**
   * Builder class for constructing CallToActionCategory instances.
   */
  public static class Builder {

    private UUID ctaCategoryId;
    private String categoryName;
    private String categoryDescription;
    private float[] ctaCategoryTextEmbedding;
    private String ctaCategoryTextEmbeddingModel;

    /**
     * Sets the unique identifier for the call to action category.
     * @param ctaCategoryId The UUID to set.
     * @return The Builder instance.
     */
    public Builder setCtaCategoryId(UUID ctaCategoryId) {
      this.ctaCategoryId = ctaCategoryId;
      return this;
    }

    /**
     * Sets the name of the call to action category.
     * @param categoryName The name to set.
     * @return The Builder instance.
     */
    public Builder setCategoryName(String categoryName) {
      this.categoryName = categoryName;
      return this;
    }

    /**
     * Sets the description of the call to action category.
     * @param categoryDescription The description to set.
     * @return The Builder instance.
     */
    public Builder setCategoryDescription(String categoryDescription) {
      this.categoryDescription = categoryDescription;
      return this;
    }

    /**
     * Sets the text embedding vector for the call to action category.
     * @param ctaCategoryTextEmbedding The text embedding vector to set.
     * @return The Builder instance.
     */
    public Builder setCtaCategoryTextEmbedding(
      float[] ctaCategoryTextEmbedding
    ) {
      this.ctaCategoryTextEmbedding = ctaCategoryTextEmbedding;
      return this;
    }

    /**
     * Sets the model used to generate the text embedding.
     * @param ctaCategoryTextEmbeddingModel The model name to set.
     * @return The Builder instance.
     */
    public Builder setCtaCategoryTextEmbeddingModel(
      String ctaCategoryTextEmbeddingModel
    ) {
      this.ctaCategoryTextEmbeddingModel = ctaCategoryTextEmbeddingModel;
      return this;
    }

    /**
     * Builds a new CallToActionCategory instance.
     * @return A new CallToActionCategory instance.
     */
    public CallToActionCategory build() {
      CallToActionCategory category = new CallToActionCategory();
      category.ctaCategoryId = this.ctaCategoryId;
      category.categoryName = this.categoryName;
      category.categoryDescription = this.categoryDescription;
      category.ctaCategoryTextEmbedding = this.ctaCategoryTextEmbedding;
      category.ctaCategoryTextEmbeddingModel =
        this.ctaCategoryTextEmbeddingModel;
      return category;
    }
  }

  // Database CRUD Methods

  /**
   * Saves the current CallToActionCategory instance to the database.
   * @param db The database instance to use.
   * @throws SQLException If an error occurs during the operation.
   */
  public void saveToDb(Db db) throws SQLException {
    if (ctaCategoryId != null) {
      updateDb(db);
      return;
    }
    ctaCategoryId = UUID.randomUUID();
    var res = db.executeUpdate(
      "INSERT INTO call_to_action_category (cta_category_id, category_name, category_description, cta_category_text_embedding, cta_category_text_embedding_model) VALUES (?, ?, ?, ?, ?)",
      ctaCategoryId,
      categoryName,
      categoryDescription,
      ctaCategoryTextEmbedding,
      ctaCategoryTextEmbeddingModel
    );
    if (res == 0) {
      throw new SQLException("Failed to insert CallToActionCategory");
    }
  }

  /**
   * Updates the current CallToActionCategory instance in the database.
   * @param db The database instance to use.
   * @throws SQLException If an error occurs during the operation.
   */
  public void updateDb(Db db) throws SQLException {
    if (ctaCategoryId == null) {
      throw new SQLException("Cannot update record without ctaCategoryId");
    }
    db.executeUpdate(
      "UPDATE call_to_action_category SET category_name = ?, category_description = ?, cta_category_text_embedding = ?, cta_category_text_embedding_model = ? WHERE cta_category_id = ?",
      categoryName,
      categoryDescription,
      ctaCategoryTextEmbedding,
      ctaCategoryTextEmbeddingModel,
      ctaCategoryId
    );
  }

  /**
   * Loads a CallToActionCategory instance from the database by its unique identifier.
   * @param db The database instance to use.
   * @param ctaCategoryId The unique identifier of the category to load.
   * @return The loaded CallToActionCategory instance, or null if not found.
   * @throws SQLException If an error occurs during the operation.
   */
  public static CallToActionCategory loadFromDb(Db db, UUID ctaCategoryId)
    throws SQLException {
    if (db == null) {
      db = Db.getInstance();
    }
    var records = db.selectObjects(
      CallToActionCategory.class,
      "SELECT * FROM call_to_action_category WHERE cta_category_id = ?",
      ctaCategoryId
    );
    return records.isEmpty() ? null : records.get(0);
  }

  /**
   * Loads all CallToActionCategory instances from the database.
   * @param db The database instance to use.
   * @return A list of all CallToActionCategory instances.
   * @throws SQLException If an error occurs during the operation.
   */
  public static List<CallToActionCategory> loadAll(Db db) throws SQLException {
    if (db == null) {
      db = Db.getInstance();
    }
    return db.selectObjects(
      CallToActionCategory.class,
      "SELECT * FROM call_to_action_category"
    );
  }

  /**
   * Deletes the current CallToActionCategory instance from the database.
   * @param db The database instance to use.
   * @throws SQLException If an error occurs during the operation.
   */
  public void deleteFromDb(Db db) throws SQLException {
    if (ctaCategoryId == null) {
      throw new SQLException("Cannot delete record without ctaCategoryId");
    }
    db.executeUpdate(
      "DELETE FROM call_to_action_category WHERE cta_category_id = ?",
      ctaCategoryId
    );
  }
}
