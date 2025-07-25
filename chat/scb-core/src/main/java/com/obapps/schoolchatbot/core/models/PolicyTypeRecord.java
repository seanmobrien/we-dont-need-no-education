package com.obapps.schoolchatbot.core.models;

import com.obapps.core.util.Db;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class PolicyTypeRecord {

  private static final Logger log = LoggerFactory.getLogger(
    PolicyTypeRecord.class
  );

  public Integer PolicyId;
  public PolicyType PolicyType;
  public String Chapter;
  public String Section;
  public String Description;

  private final List<String> aliases;

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
    this.aliases = new ArrayList<String>();
  }

  public Integer lookupPolicyId() {
    return lookupPolicyId(false);
  }

  public void addAlias(String alias) {
    if (alias != null && !alias.isEmpty()) {
      this.aliases.add(alias);
    }
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
      if (readPolicyId.compareTo(1) < 0 && createIfMissing) {
        Integer policyId = Db.getInstance()
          .insertAndGetGeneratedKeys(
            "INSERT INTO policies_statutes (policy_type_id, chapter, section, description) VALUES (?, COALESCE(?, NULL), COALESCE(?, NULL), COALESCE(?, NULL))",
            PolicyTypeConstants.getValueOf(this.PolicyType),
            this.Chapter,
            this.Section,
            this.Description
          );
        if (policyId == null || policyId.compareTo(1) < 0) {
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
      log.error("Database failure", e);
      return 0;
    }
  }

  public Boolean isChapterMatch(String input) {
    if (input == this.Chapter || this.aliases.contains(input)) {
      return true;
    }
    return false;
  }

  /**
   * Parses the given input string to create a {@code PolicyTypeRecord} object.
   *
   * <p>The input string is expected to follow the format:
   * {@code POLICYTYPE_CHAPTER[.SECTION] - DESCRIPTION.pdf}, where:
   * <ul>
   *   <li>{@code POLICYTYPE} is a sequence of uppercase letters identifying the {@link PolicyType}.</li>
   *        - e.g. {@code FED}, {@code MN} ({@link PolicyType.State}), or {@code PLSAS} ({@link PolicyType.Policy}).
   *   </li>
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
      switch (matcher.group("policytype")) {
        case "FED":
          type = com.obapps.schoolchatbot.core.models.PolicyType.FederalLaw;
          break;
        case "MN":
          type = com.obapps.schoolchatbot.core.models.PolicyType.StateLaw;
          break;
        case "PLSAS":
          type = com.obapps.schoolchatbot.core.models.PolicyType.School;
          break;
        default:
          log.warn(
            "Unrecognized policy type: {}, the provided default of {} will be used.",
            matcher.group("policytype"),
            type
          );
          break;
      }
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
