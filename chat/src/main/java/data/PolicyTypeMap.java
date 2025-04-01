package data;

import java.util.HashMap;
import java.util.Map;

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
        new PolicyTypeRecord(7, PolicyType.StateLaw, "363", "A", "Human Rights")
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
      if (entry.getValue().Chapter.equals(chapter)) {
        return entry.getValue();
      }
    }
    return null;
  }
}
