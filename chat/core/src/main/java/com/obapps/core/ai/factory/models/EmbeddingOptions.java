package com.obapps.core.ai.factory.models;

import com.obapps.core.util.EnvVars;

/**
 * Represents options for embedding models, including dimensions.
 */
public class EmbeddingOptions {

  /**
   * The dimensions for the embedding model.
   */
  public Integer dimensions;

  /**
   * Default constructor that initializes dimensions to the large vector size.
   */
  EmbeddingOptions() {
    this(EnvVars.getInstance().getOpenAi().getVectorSizeLarge());
  }

  /**
   * Constructor that allows specifying dimensions. If dimensions are null or zero,
   * it defaults to the large vector size.
   *
   * @param dimensions the dimensions for the embedding model
   */
  EmbeddingOptions(Integer dimensions) {
    if (dimensions == null || dimensions == 0) {
      dimensions = EnvVars.getInstance().getOpenAi().getVectorSizeLarge();
    }
    this.dimensions = dimensions;
  }

  /**
   * Creates a new Builder instance for constructing EmbeddingOptions.
   *
   * @return a new Builder instance
   */
  public static Builder builder() {
    return new Builder();
  }

  /**
   * Builder class for constructing EmbeddingOptions instances.
   */
  public static class Builder {

    private Integer dimensions;

    /**
     * Sets the dimensions for the embedding model.
     *
     * @param dimensions the dimensions to set
     * @return the Builder instance
     */
    public Builder setDimensions(Integer dimensions) {
      this.dimensions = dimensions;
      return this;
    }

    /**
     * Sets the dimensions to the large vector size.
     *
     * @return the Builder instance
     */
    public Builder setDimensionsLarge() {
      return this.setDimensions(
          EnvVars.getInstance().getOpenAi().getVectorSizeLarge()
        );
    }

    /**
     * Sets the dimensions to the small vector size.
     *
     * @return the Builder instance
     */
    public Builder setDimensionsSmall() {
      return this.setDimensions(
          EnvVars.getInstance().getOpenAi().getVectorSizeSmall()
        );
    }

    /**
     * Builds an EmbeddingOptions instance. If dimensions are not set, it defaults
     * to the large vector size.
     *
     * @return a new EmbeddingOptions instance
     */
    public EmbeddingOptions build() {
      if (this.dimensions == null) {
        this.dimensions = EnvVars.getInstance()
          .getOpenAi()
          .getVectorSizeLarge();
      }
      return new EmbeddingOptions(this.dimensions);
    }
  }
}
