package data;

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
  public String sourceFolder = null;

  public EmbedPolicyFolderOptions setPolicyType(PolicyType type) {
    this.policyType = type;
    System.out.println("  Parse policy type: " + type);
    return this;
  }

  public EmbedPolicyFolderOptions setSourceFolder(String sourceFolder) {
    this.sourceFolder = sourceFolder;
    System.out.println("  Source Filder: " + sourceFolder);
    return this;
  }
}
