package com.obapps.schoolchatbot.core.models;

/**
 * Represents options for embedding documents.
 * This class extends {@link ProgramOptions} and provides additional configuration
 * for document embedding operations.
 */
public class EmbedDocumentsOptions extends ProgramOptions {

  /**
   * Flag to indicate whether to reindex documents.
   * If set to true, the documents will be reindexed.
   * Default is false.
   */
  public Boolean reindex = false;

  public EmbedDocumentsOptions setReindex(Boolean reindex) {
    this.reindex = reindex;
    if (reindex) {
      System.out.println("  Reindexing mode enabled");
    }
    return this;
  }
}
