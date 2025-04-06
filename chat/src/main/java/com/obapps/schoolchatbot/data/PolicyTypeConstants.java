package com.obapps.schoolchatbot.data;

/**
 * The {@code PolicyTypeConstants} class provides a set of constant values
 * representing different types of policies. These constants can be used
 * throughout the application to refer to specific policy types in a
 * consistent and type-safe manner.
 */
public final class PolicyTypeConstants {

  /**
   * Represents a policy type for school-related policies.
   * Value: {@code 1}
   */
  public static final Integer POLICY_TYPE_SCHOOL = 1;

  /**
   * Represents a policy type for state law-related policies.
   * Value: {@code 2}
   */
  public static final Integer POLICY_TYPE_STATE_LAW = 2;

  /**
   * Represents a policy type for federal law-related policies.
   * Value: {@code 3}
   */
  public static final Integer POLICY_TYPE_FEDERAL_LAW = 3;

  /**
   * Retrieves the integer value associated with the specified policy type.
   *
   * @param type The policy type for which the integer value is to be retrieved.
   *             Must be one of the predefined policy types (e.g., School, StateLaw, FederalLaw).
   * @return The integer value corresponding to the given policy type.
   * @throws IllegalArgumentException If the provided policy type is unknown or unsupported.
   */
  public static Integer getValueOf(PolicyType type) {
    switch (type) {
      case School:
        return POLICY_TYPE_SCHOOL;
      case StateLaw:
        return POLICY_TYPE_STATE_LAW;
      case FederalLaw:
        return POLICY_TYPE_FEDERAL_LAW;
      default:
        throw new IllegalArgumentException("Unknown policy type: " + type);
    }
  }

  /**
   * Retrieves the corresponding {@link PolicyType} based on the provided integer value.
   *
   * @param value the integer value representing a specific policy type.
   *              Valid values are:
   *              <ul>
   *                  <li>1 - {@link PolicyType#School}</li>
   *                  <li>2 - {@link PolicyType#StateLaw}</li>
   *                  <li>3 - {@link PolicyType#FederalLaw}</li>
   *              </ul>
   * @return the {@link PolicyType} corresponding to the provided value.
   * @throws IllegalArgumentException if the provided value does not match any known policy type.
   */
  public static PolicyType getPolicyType(Integer value) {
    switch (value) {
      case 1:
        return PolicyType.School;
      case 2:
        return PolicyType.StateLaw;
      case 3:
        return PolicyType.FederalLaw;
      default:
        throw new IllegalArgumentException(
          "Unknown policy type value: " + value
        );
    }
  }

  public static String getDescription(PolicyType type) {
    switch (type) {
      case School:
        return "School Policy";
      case StateLaw:
        return "State Law";
      case FederalLaw:
        return "Federal Law";
      default:
        return "Unknown Policy Type";
    }
  }

  public static String getDescription(String value) {
    if (value == null || value.isEmpty()) {
      return "";
    }
    try {
      return getDescription(getPolicyType(Integer.parseInt(value)));
    } catch (NumberFormatException e) {
      return "Unknown Policy Type [" + value + "]";
    }
  }

  /**
   * Private constructor to prevent instantiation of this utility class.
   */
  private PolicyTypeConstants() {
    // Prevent instantiation
  }
}
