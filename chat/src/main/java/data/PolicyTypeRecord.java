package data;

import java.sql.SQLException;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.LoggerFactory;
import util.Db;

public class PolicyTypeRecord {

  public Integer PolicyId;
  public PolicyType PolicyType;
  public String Chapter;
  public String Section;
  public String Description;

  public PolicyTypeRecord(
    Integer policyId,
    PolicyType policyType,
    String chapter,
    String section,
    String description
  ) {
    this.PolicyId = policyId;
    this.PolicyType = policyType;
    this.Chapter = chapter;
    this.Section = section;
    this.Description = description;
  }

  public PolicyTypeRecord() {}

  public Integer lookupPolicyId() {
    return lookupPolicyId(false);
  }

  public Integer lookupPolicyId(Boolean createIfMissing) {
    if (Objects.requireNonNullElse(this.PolicyId, 0) > 0) {
      return this.PolicyId;
    }
    try {
      var readPolicyId = Db.getInstance()
        .<Integer>selectSingleValue(
          "SELECT policy_id FROM policies_statutes WHERE policy_type_id=? AND " +
          "COALESCE(chapter, 'null-match')=COALESCE(?, 'null-match') AND " +
          "COALESCE(section, 'null-match')=COALESCE(?, 'null-match')",
          PolicyTypeConstants.getValueOf(this.PolicyType),
          this.Chapter,
          this.Section
        )
        .orElse(0);
      if (readPolicyId < 1 && createIfMissing) {
        Integer policyId = Db.getInstance()
          .insertAndGetGeneratedKeys(
            "INSERT INTO policies_statutes (policy_type_id, chapter, section, description) VALUES (?, COALESCE(?, NULL), COALESCE(?, NULL), COALESCE(?, NULL))",
            PolicyTypeConstants.getValueOf(this.PolicyType),
            this.Chapter,
            this.Section,
            this.Description
          );
        if (policyId == null || policyId < 1) {
          throw new SQLException(
            "Failed to insert new policy record: Generated policy ID is invalid"
          );
        }
        this.PolicyId = policyId;
        return this.PolicyId;
      }
      this.PolicyId = readPolicyId;
      return this.PolicyId;
    } catch (SQLException e) {
      LoggerFactory.getLogger(PolicyTypeRecord.class).error(
        "Database failure",
        e
      );
      return 0;
    }
  }

  /**
   * Parses the given input string to create a {@code PolicyTypeRecord} object.
   *
   * <p>The input string is expected to follow the format:
   * {@code POLICYTYPE_CHAPTER[.SECTION] - DESCRIPTION.pdf}, where:
   * <ul>
   *   <li>{@code POLICYTYPE} is a sequence of uppercase letters.</li>
   *   <li>{@code CHAPTER} is a numeric value.</li>
   *   <li>{@code SECTION} is an optional numeric value.</li>
   *   <li>{@code DESCRIPTION} is a textual description.</li>
   * </ul>
   *
   * @param type  The {@code PolicyType} associated with the record.
   * @param input The input string to parse.
   * @return A {@code PolicyTypeRecord} object if the input string matches the expected format,
   *         or {@code null} if the input string does not match.
   */
  public static PolicyTypeRecord parse(PolicyType type, String input) {
    // Regular expression to parse the input string
    String regex =
      "(?<policytype>[A-Z]+)_(?<chapter>(?:\\d+)|(?:TitleIX)|(?:FERPA))(?:\\.(?<section>\\d|\\w+))?(?:\\s-\\s|\\.)?(?<description>.+)\\.pdf";
    Pattern pattern = Pattern.compile(regex);
    Matcher matcher = pattern.matcher(input);

    // If the input matches the pattern, extract the groups and create a PolicyTypeRecord
    if (matcher.matches()) {
      // PolicyType is throwaway until we've established a pattern
      String chapter = matcher.group("chapter");
      String section = matcher.group("section"); // May be null
      String description = matcher.group("description");
      if (description != null) {
        description = description
          .replaceAll("_", " ")
          .replaceAll("\\s+", " ")
          .trim();
      } else {
        description = null;
      }

      // Create and return a new PolicyTypeRecord
      return new PolicyTypeRecord(
        null, // PolicyId is not available in the input string
        type,
        chapter,
        section,
        description
      );
    }

    // Return null if no match is found
    return null;
  }
}
