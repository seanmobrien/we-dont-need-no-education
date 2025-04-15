package com.obapps.schoolchatbot.core.models;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

/**
 * The PolicyTypeMap class extends HashMap to provide a predefined mapping
 * of integer keys to PolicyTypeRecord objects. This map is initialized
 * with a set of predefined policy type records, each representing a specific
 * policy type with associated metadata.
 *
 * <p>Each entry in the map consists of:
 * <ul>
 *   <li>An integer key representing the policy ID.</li>
 *   <li>A PolicyTypeRecord object containing details such as:
 *     <ul>
 *       <li>Policy ID</li>
 *       <li>Policy type (e.g., School)</li>
 *       <li>Policy code</li>
 *       <li>Policy category</li>
 *       <li>Policy description</li>
 *     </ul>
 *   </li>
 * </ul>
 *
 * <p>This class is designed to provide a convenient way to access predefined
 * policy type records by their corresponding integer keys.
 *
 * <p>Example usage:
 * <pre>
 * PolicyTypeMap policyTypeMap = new PolicyTypeMap();
 * PolicyTypeRecord record = policyTypeMap.get(1);
 * System.out.println(record.getDescription()); // Outputs: "Data Practices"
 * </pre>
 *
 * <p>Note: This class is immutable as the map is initialized with a fixed set
 * of entries and does not support modification after construction.
 */
public class PolicyTypeMap extends HashMap<Integer, PolicyTypeRecord> {

  public static final PolicyTypeMap Instance = new PolicyTypeMap();

  public PolicyTypeMap() {
    super(
      Map.of(
        1,
        new PolicyTypeRecord(
          1,
          PolicyType.StateLaw,
          "13",
          null,
          "Data Practices"
        ),
        2,
        new PolicyTypeRecord(
          2,
          PolicyType.StateLaw,
          "121",
          "A",
          "Student Rights and Responsibilities"
        ),
        3,
        new PolicyTypeRecord(
          3,
          PolicyType.StateLaw,
          "122",
          "A",
          "Teachers and Educators"
        ),
        4,
        new PolicyTypeRecord(
          4,
          PolicyType.StateLaw,
          "123",
          "B",
          "School District Powers and Responsibilities"
        ),
        5,
        new PolicyTypeRecord(
          5,
          PolicyType.StateLaw,
          "125",
          "B",
          "Education and Technology"
        ),
        6,
        new PolicyTypeRecord(
          6,
          PolicyType.StateLaw,
          "127",
          "A",
          "Admin of Education"
        ),
        7,
        new PolicyTypeRecord(
          7,
          PolicyType.StateLaw,
          "363",
          "A",
          "Human Rights"
        ),
        8,
        new PolicyTypeRecord(
          8,
          PolicyType.School,
          "103",
          null,
          "Complaints-Students, Employees, Parents, Other Persons"
        ),
        9,
        new PolicyTypeRecord(
          9,
          PolicyType.School,
          "1920",
          null,
          "PLHS Student Handbook"
        ),
        10,
        new PolicyTypeRecord(
          10,
          PolicyType.School,
          "211",
          null,
          "Criminal or Civil Action Against School District, School Board Member, Employee or Student"
        )
      )
    );
    put(
      11,
      new PolicyTypeRecord(
        11,
        PolicyType.School,
        "301",
        null,
        "School District Administration"
      )
    );
    put(
      12,
      new PolicyTypeRecord(
        12,
        PolicyType.School,
        "304",
        null,
        "Superintendent Contract, Duties and Evaluation"
      )
    );
    put(
      13,
      new PolicyTypeRecord(
        13,
        PolicyType.School,
        "306",
        null,
        "Administrator Code of Ethics"
      )
    );
    put(
      14,
      new PolicyTypeRecord(
        14,
        PolicyType.School,
        "403",
        null,
        "Discipline, Suspension and Dismissal of School District Employees"
      )
    );
    put(
      15,
      new PolicyTypeRecord(
        15,
        PolicyType.School,
        "406",
        null,
        "Public and Private Personnel Data"
      )
    );
    put(16, new PolicyTypeRecord(16, PolicyType.School, "407", null, "Safety"));
    put(
      17,
      new PolicyTypeRecord(
        17,
        PolicyType.School,
        "414",
        null,
        "Mandated Reporting"
      )
    );
    put(
      18,
      new PolicyTypeRecord(18, PolicyType.School, "501", null, "Weapons")
    );
    put(
      19,
      new PolicyTypeRecord(
        19,
        PolicyType.School,
        "504",
        null,
        "Procedural Safeguards"
      )
    );
    put(
      20,
      new PolicyTypeRecord(
        20,
        PolicyType.School,
        "506",
        null,
        "Student Discipline"
      )
    );
    put(
      21,
      new PolicyTypeRecord(
        21,
        PolicyType.School,
        "506",
        "1",
        "Bullying Prohibition"
      )
    );
    put(
      22,
      new PolicyTypeRecord(
        22,
        PolicyType.School,
        "515",
        null,
        "Protection and Privacy of Student Records"
      )
    );
    put(
      23,
      new PolicyTypeRecord(
        23,
        PolicyType.School,
        "521",
        null,
        "Grievance Procedure"
      )
    );
    put(
      24,
      new PolicyTypeRecord(
        24,
        PolicyType.School,
        "522",
        null,
        "Title IX Sex Nondiscrimination Policy, Grievance Procedure and Process"
      )
    );
    put(
      25,
      new PolicyTypeRecord(
        25,
        PolicyType.School,
        "524",
        null,
        "Electronic Technologies Acceptable Use Policy"
      )
    );
    put(
      26,
      new PolicyTypeRecord(
        26,
        PolicyType.School,
        "526",
        null,
        "Harassment Violence Report Form"
      )
    );
    put(
      27,
      new PolicyTypeRecord(
        27,
        PolicyType.School,
        "722",
        null,
        "Public Data Requests"
      )
    );
    put(
      28,
      new PolicyTypeRecord(28, PolicyType.FederalLaw, "FERPA", null, "FERPA")
    );
    put(
      29,
      new PolicyTypeRecord(
        29,
        PolicyType.FederalLaw,
        "TitleIX",
        "FinalRule",
        "Final Rule"
      )
    );
    put(
      30,
      new PolicyTypeRecord(
        30,
        PolicyType.FederalLaw,
        "TitleIX",
        "Statute",
        "Title IX"
      )
    );
    put(
      200,
      new PolicyTypeRecord(
        200,
        PolicyType.StateLaw,
        "626",
        "556",
        "MN Statute 626.556"
      )
    );
  }

  /**
   * Retrieves a PolicyTypeRecord based on the specified chapter number.
   *
   * @param chapter the chapter number as an Integer
   * @return the PolicyTypeRecord corresponding to the given chapter
   */
  public PolicyTypeRecord getByChapter(Integer chapter) {
    return getByChapter(chapter.toString());
  }

  /**
   * Retrieves a PolicyTypeRecord by matching the specified chapter.
   *
   * @param chapter the chapter to search for in the map entries
   * @return the PolicyTypeRecord associated with the given chapter,
   *         or {@code null} if no matching entry is found
   */
  public PolicyTypeRecord getByChapter(String chapter) {
    for (var entry : this.entrySet()) {
      if (entry.getValue().isChapterMatch(chapter)) {
        return entry.getValue();
      }
    }
    return null;
  }

  public Integer lookupPolicyId(String thePolicyId) {
    thePolicyId = Objects.requireNonNullElse(thePolicyId, "").trim();
    if (thePolicyId.isEmpty()) {
      return 0;
    }
    try {
      var parsedPolicyId = Integer.parseInt(thePolicyId);
      if (containsKey(parsedPolicyId)) {
        return parsedPolicyId;
      }
      var record = getByChapter(thePolicyId);
      if (record != null) {
        return record.PolicyId;
      }
    } catch (IllegalArgumentException ex) {
      // Could not parse input as an integer,
      // so we need to do a little more digging
    }
    var contentBuilder = new StringBuilder(
      "Given the following data set:\nBEGIN PolicyId Records\n["
    );

    for (var entry : this.entrySet()) {
      contentBuilder
        .append(
          "{\"policy_id\":%d,\"policy_type\":\"%s\",\"chapter\":\"%s\",\"description\":\"%s\"},"
        )
        .append(entry.getValue().toString());
    }
    contentBuilder.setLength(contentBuilder.length() - 1); // Remove the last comma
    contentBuilder.append("]\nEND PolicyId Records\n\n");
    contentBuilder.append(
      "Identify the policy_id value that is best match for the following: ["
    );
    contentBuilder.append(thePolicyId).append("]\n");
    contentBuilder.append(
      "\n\nReturn only the policy_id value, without any other text.\n\n"
    );
    /*
    var response = SchoolChatBot.completions().chat(contentBuilder.toString());
    if (response == null || response == "") {
      return 0;
    }
    try {
      var policyId = Integer.parseInt(response);
      if (containsKey(policyId)) {
        get(policyId).addAlias(thePolicyId);
        return policyId;
      } else {
        put(
          policyId,
          new PolicyTypeRecord(
            policyId,
            PolicyType.School,
            thePolicyId,
            null,
            null
          )
        );
      }
    } catch (Exception ex) {
      // Intentional no-op
    }
    
    */
    return 0;
  }
}
