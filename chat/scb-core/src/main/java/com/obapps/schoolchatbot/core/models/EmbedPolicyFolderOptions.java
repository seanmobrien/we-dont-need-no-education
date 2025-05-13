package com.obapps.schoolchatbot.core.models;

/**
 * Represents options for embedding documents.
 * This class extends {@link ProgramOptions} and provides additional configuration
 * for document embedding operations.
 */
public class EmbedPolicyFolderOptions extends ProgramOptions {

  /**
   * Flag to indicate whether to reindex documents.
   * If set to true, the documents will be reindexed.
   * Default is false.
   */
  public PolicyType policyType = PolicyType.StateLaw;
  /**
   * The source folder path for the embed policy folder options.
   * This variable holds the path to the folder where source files are located.
   * It can be null if no source folder is specified.
   */
  public String sourceFolder = null;

  /**
   * Sets the policy type for the EmbedPolicyFolderOptions instance.
   *
   * @param type The policy type to be set.
   * @return The current instance of EmbedPolicyFolderOptions for method chaining.
   */
  public EmbedPolicyFolderOptions setPolicyType(PolicyType type) {
    this.policyType = type;
    System.out.println("  Parse policy type: " + type);
    return this;
  }

  /**
   * Sets the source folder for the EmbedPolicyFolderOptions.
   *
   * @param sourceFolder the path to the source folder to be set
   * @return the current instance of EmbedPolicyFolderOptions for method chaining
   */
  public EmbedPolicyFolderOptions setSourceFolder(String sourceFolder) {
    this.sourceFolder = sourceFolder;
    System.out.println("  Source Filder: " + sourceFolder);
    return this;
  }
}
