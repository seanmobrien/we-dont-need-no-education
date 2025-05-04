package com.obapps.core.ai.factory.models;

/**
 * Enum representing different types of models that can be used in the application.
 *
 * <ul>
 *   <li><b>Unknown</b>: Represents an unspecified or unrecognized model type.</li>
 *   <li><b>HiFi</b>: Represents a high-fidelity model, typically used for scenarios requiring high accuracy.</li>
 *   <li><b>LoFi</b>: Represents a low-fidelity model, typically used for scenarios where performance is prioritized over accuracy.</li>
 *   <li><b>Embedding</b>: Represents a model used for generating embeddings, often used in natural language processing tasks.</li>
 * </ul>
 */
public enum ModelType {
  /**
   * Unknown model type.
   */
  Unknown,
  /**
   * High-fidelity model type.
   */
  HiFi,
  /**
   * Low-fidelity model type.
   */
  LoFi,
  /**
   * Embedding models aren't "real" models, but still...
   */
  Embedding,
}
