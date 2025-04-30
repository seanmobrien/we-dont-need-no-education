package com.obapps.core.util.sql;

import com.obapps.core.util.DateTimeFormats;
import com.obapps.core.util.Db;
import java.sql.Array;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Consumer;
import org.postgresql.jdbc.PgArray;

public class FieldUtil {

  /**
   * Saves a value from the provided state bag into a target field using a setter function.
   * If the specified field is not found in the state bag, a default value is used instead.
   *
   * @param stateBag    A map containing the state data.
   * @param fieldName   The name of the field to retrieve from the state bag.
   * @param setter      A Consumer function to set the value of the target field.
   * @param defaultValue The default value to use if the field is not found in the state bag.
   * @return            A Boolean indicating whether the value was successfully retrieved
   *                    from the state bag (true) or if the default value was used (false).
   */
  public static Boolean saveLocalDateTimeFromStateBag(
    Map<String, Object> stateBag,
    String fieldName,
    Consumer<LocalDateTime> setter
  ) {
    boolean ret = true;
    var v1 = stateBag.get(fieldName);
    if (v1 == null) {
      return false;
    }
    LocalDateTime value;
    try {
      value = ((java.sql.Timestamp) v1).toLocalDateTime();
    } catch (Exception e) {
      var asString = v1.toString();
      value = LocalDateTime.parse(
        v1.toString(),
        DateTimeFormatter.ofPattern(
          asString.indexOf('T') != -1
            ? "yyyy-MM-dd'T'HH:mm:ss.n"
            : "yyyy-MM-dd HH:mm:ss.n"
        )
      );
      return false;
    }
    setter.accept(value);
    return ret;
  }

  public static Boolean saveBooleanFromStateBag(
    Map<String, Object> stateBag,
    String fieldName,
    Consumer<Boolean> setter
  ) {
    Boolean ret = true;
    var v1 = stateBag.get(fieldName);
    if (v1 == null) {
      return false;
    }
    Boolean value;
    try {
      value = (Boolean) v1;
    } catch (Exception e) {
      value = Boolean.parseBoolean(v1.toString());
      return false;
    }
    setter.accept(value);
    return ret;
  }

  /**
   * Saves a value from the provided state bag into a target field using a setter function.
   * If the specified field is not found in the state bag, a default value is used instead.
   *
   * @param stateBag    A map containing the state data.
   * @param fieldName   The name of the field to retrieve from the state bag.
   * @param setter      A Consumer function to set the value of the target field.
   * @param defaultValue The default value to use if the field is not found in the state bag.
   * @return            A Boolean indicating whether the value was successfully retrieved
   *                    from the state bag (true) or if the default value was used (false).
   */
  public static Boolean saveLocalDateFromStateBag(
    Map<String, Object> stateBag,
    String fieldName,
    Consumer<LocalDate> setter
  ) {
    Boolean ret = true;
    var v1 = stateBag.get(fieldName);
    if (v1 == null) {
      return false;
    }
    LocalDate value;
    try {
      value = ((java.sql.Timestamp) v1).toInstant()
        .atZone(java.time.ZoneId.systemDefault())
        .toLocalDate();
    } catch (Exception e) {
      value = LocalDate.parse(
        v1.toString(),
        DateTimeFormatter.ofPattern("yyyy-MM-dd")
      );
      return false;
    }
    setter.accept(value);
    return ret;
  }

  /**
   * Retrieves a value from the state bag using the specified field name.
   * If the field is not found, it returns an empty string.
   *
   * @param stateBag The state bag containing key-value pairs.
   * @param fieldName The name of the field to retrieve.
   * @return The value associated with the field name, or an empty string if not found.
   */

  public static String getFromStateBag(
    Map<String, Object> stateBag,
    String fieldName
  ) {
    return FieldUtil.getFromStateBag(stateBag, fieldName, "");
  }

  /**
   * Retrieves a value from the provided state bag map based on the specified field name.
   * If the field is not present in the map or its value is null, the default value is returned.
   *
   * @param stateBag    A map containing state data where keys are field names and values are objects.
   * @param fieldName   The name of the field to retrieve from the state bag.
   * @param defaultValue The default value to return if the field is not found or its value is null.
   * @return The value associated with the specified field name as a string, or the default value if the field is not found or null.
   */
  public static String getFromStateBag(
    Map<String, Object> stateBag,
    String fieldName,
    String defaultValue
  ) {
    var fld = stateBag.get(fieldName);
    return fld == null ? defaultValue : fld.toString();
  }

  /**
   * Saves a value from the provided state bag into a target field using a setter function.
   * If the specified field is not found in the state bag, a default value is used instead.
   *
   * @param stateBag    A map containing the state data.
   * @param fieldName   The name of the field to retrieve from the state bag.
   * @param setter      A Consumer function to set the value of the target field.
   * @return            A Boolean indicating whether the value was successfully retrieved
   *                    from the state bag (true) or if the default value was used (false).
   */
  public static Boolean saveFromStateBag(
    Map<String, Object> stateBag,
    String fieldName,
    Consumer<String> setter
  ) {
    return FieldUtil.saveFromStateBag(stateBag, fieldName, setter, "");
  }

  /**
   * Saves a value from the provided state bag into a target field using a setter function.
   * If the specified field is not found in the state bag, a default value is used instead.
  \ *
   * @param stateBag    A map containing the state data.
   * @param fieldName   The name of the field to retrieve from the state bag.
   * @param setter      A Consumer function to set the value of the target field.
   * @param defaultValue The default value to use if the field is not found in the state bag.
   * @return            A Boolean indicating whether the value was successfully retrieved
   *                    from the state bag (true) or if the default value was used (false).
   */
  public static Boolean saveFromStateBag(
    Map<String, Object> stateBag,
    String fieldName,
    Consumer<String> setter,
    String defaultValue
  ) {
    Boolean ret = true;
    var v = getFromStateBag(stateBag, fieldName, Db.NO_VALUE);
    if (v == Db.NO_VALUE) {
      ret = false;
      v = defaultValue;
    }
    setter.accept(v.toString());
    return ret;
  }

  /**
   * Saves a value from the provided state bag into a target field using a setter function.
   * If the specified field is not found in the state bag, a default value is used instead.
   *
   * @param stateBag    A map containing the state data.
   * @param fieldName   The name of the field to retrieve from the state bag.
   * @param setter      A Consumer function to set the value of the target field.
   * @param defaultValue The default value to use if the field is not found in the state bag.
   * @return            A Boolean indicating whether the value was successfully retrieved
   *                    from the state bag (true) or if the default value was used (false).
   */
  public static Boolean saveIntFromStateBag(
    Map<String, Object> stateBag,
    String fieldName,
    Consumer<Integer> setter
  ) {
    return FieldUtil.saveFromStateBag(stateBag, fieldName, setter, 0);
  }

  /**
   * Saves a value from the provided state bag into a target field using a setter function.
   * If the specified field is not found in the state bag, a default value is used instead.
   *
   * @param stateBag    A map containing the state data.
   * @param fieldName   The name of the field to retrieve from the state bag.
   * @param setter      A Consumer function to set the value of the target field.
   * @param defaultValue The default value to use if the field is not found in the state bag.
   * @return            A Boolean indicating whether the value was successfully retrieved
   *                    from the state bag (true) or if the default value was used (false).
   */
  public static Boolean saveFromStateBag(
    Map<String, Object> stateBag,
    String fieldName,
    Consumer<Integer> setter,
    Integer defaultValue
  ) {
    Boolean ret = true;
    Integer v;
    var v1 = getFromStateBag(stateBag, fieldName, Db.NO_VALUE);
    if (v1 == Db.NO_VALUE) {
      ret = false;
      v1 = defaultValue.toString();
    }
    v = Integer.parseInt(v1.toString());
    setter.accept(v);
    return ret;
  }

  /**
   * Saves a value from the provided state bag into a target field using a setter function.
   * If the specified field is not found in the state bag, a default value is used instead.
   *
   * @param stateBag    A map containing the state data.
   * @param fieldName   The name of the field to retrieve from the state bag.
   * @param setter      A Consumer function to set the value of the target field.
   * @param defaultValue The default value to use if the field is not found in the state bag.
   * @return            A Boolean indicating whether the value was successfully retrieved
   *                    from the state bag (true) or if the default value was used (false).
   */
  public static Boolean saveDoubleFromStateBag(
    Map<String, Object> stateBag,
    String fieldName,
    Consumer<Double> setter
  ) {
    return FieldUtil.saveFromStateBag(
      stateBag,
      fieldName,
      setter,
      Double.valueOf(0)
    );
  }

  /**
   * Saves a value from the provided state bag into a target field using a setter function.
   * If the specified field is not found in the state bag, a default value is used instead.
   *
   * @param stateBag    A map containing the state data.
   * @param fieldName   The name of the field to retrieve from the state bag.
   * @param setter      A Consumer function to set the value of the target field.
   * @param defaultValue The default value to use if the field is not found in the state bag.
   * @return            A Boolean indicating whether the value was successfully retrieved
   *                    from the state bag (true) or if the default value was used (false).
   */
  public static Boolean saveFromStateBag(
    Map<String, Object> stateBag,
    String fieldName,
    Consumer<Double> setter,
    Double defaultValue
  ) {
    Boolean ret = true;
    Double v;
    var v1 = getFromStateBag(stateBag, fieldName, Db.NO_VALUE);
    if (v1 == Db.NO_VALUE) {
      ret = false;
      v1 = defaultValue.toString();
    }
    v = Double.parseDouble(v1.toString());
    setter.accept(v);
    return ret;
  }

  /**
   * Saves a value from the provided state bag into a target field using a setter function.
   * If the specified field is not found in the state bag, a default value is used instead.
   *
   * @param stateBag    A map containing the state data.
   * @param fieldName   The name of the field to retrieve from the state bag.
   * @param setter      A Consumer function to set the value of the target field.
   * @param defaultValue The default value to use if the field is not found in the state bag.
   * @return            A Boolean indicating whether the value was successfully retrieved
   *                    from the state bag (true) or if the default value was used (false).
   */
  public static Boolean saveUuidFromStateBag(
    Map<String, Object> stateBag,
    String fieldName,
    Consumer<UUID> setter
  ) {
    Boolean ret = true;
    var v1 = stateBag.get(fieldName);
    if (v1 == null) {
      return false;
    }
    UUID value;
    try {
      value = (UUID) v1;
    } catch (Exception e) {
      value = UUID.fromString(v1.toString());
      return false;
    }
    setter.accept(value);
    return ret;
  }

  /**
   * Saves a value from the provided state bag into a target field using a setter function.
   * If the specified field is not found in the state bag, a default value is used instead.
   *
   * @param stateBag    A map containing the state data.
   * @param fieldName   The name of the field to retrieve from the state bag.
   * @param setter      A Consumer function to set the value of the target field.
   * @param defaultValue The default value to use if the field is not found in the state bag.
   * @return            A Boolean indicating whether the value was successfully retrieved
   *                    from the state bag (true) or if the default value was used (false).
   */
  public static Boolean saveOffsetDateFromStateBag(
    Map<String, Object> stateBag,
    String fieldName,
    Consumer<OffsetDateTime> setter
  ) {
    Boolean ret = true;
    var v1 = stateBag.get(fieldName);
    if (v1 == null) {
      return false;
    }
    OffsetDateTime value;
    try {
      value = (OffsetDateTime) v1;
    } catch (Exception e) {
      ret = false;
      value = DateTimeFormats.asOffsetDateTime(v1.toString());
    }
    setter.accept(value);
    return ret;
  }

  /**
   * Saves a value from the provided state bag into a target field using a setter function.
   * The value is expected to be an array of strings. If the specified field is not found
   * in the state bag, an empty list is used instead.
   *
   * @param stateBag    A map containing the state data.
   * @param fieldName   The name of the field to retrieve from the state bag.
   * @param setter      A Consumer function to set the value of the target field.
   * @return            A Boolean indicating whether the value was successfully retrieved
   *                    from the state bag (true) or if the default value (empty list) was used (false).
   */
  public static Boolean saveStringArrayFromStateBag(
    Map<String, Object> stateBag,
    String fieldName,
    Consumer<List<String>> setter
  ) {
    Boolean ret = true;
    var v1 = stateBag.get(fieldName);
    if (v1 == null) {
      setter.accept(new ArrayList<>());
      return false;
    }
    List<String> value;
    try {
      if (v1 instanceof PgArray) {
        var pgArray = (PgArray) v1;
        value = List.of((String[]) pgArray.getArray());
      } else if (v1 instanceof Array) {
        var array = (Array) v1;
        value = List.of((String[]) array.getArray());
      } else if (v1 instanceof String) {
        value = List.of(v1.toString());
      } else if (v1 instanceof List) {
        value = new ArrayList<>();
        for (Object obj : (List<?>) v1) {
          value.add(obj.toString());
        }
      } else {
        throw new IllegalArgumentException(
          "Unsupported type for string array conversion"
        );
      }
    } catch (Exception e) {
      setter.accept(new ArrayList<>());
      return false;
    }
    setter.accept(value);
    return ret;
  }
}
