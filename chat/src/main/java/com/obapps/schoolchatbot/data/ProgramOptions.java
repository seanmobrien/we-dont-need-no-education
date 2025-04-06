package com.obapps.schoolchatbot.data;

/**
 * The {@code ProgramOptions} class represents configuration options for a program.
 * It contains settings that can be used to control the program's behavior.
 */
public class ProgramOptions {

  /**
   * A flag indicating whether verbose output is enabled.
   * If {@code true}, the program will produce detailed logs or output.
   * Default value is {@code false}.
   */
  public boolean verbose = false;

  @SuppressWarnings("unchecked")
  public <T extends ProgramOptions> T setVerbose(boolean verbose) {
    this.verbose = verbose;
    if (verbose) {
      System.out.println("  Verbose mode enabled");
    }
    return (T) this;
  }
}
