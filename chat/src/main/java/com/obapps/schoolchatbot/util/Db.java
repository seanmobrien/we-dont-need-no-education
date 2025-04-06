package com.obapps.schoolchatbot.util;

import com.obapps.schoolchatbot.data.Colors;
import java.sql.Array;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Consumer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * The `Db` class provides a thread-safe singleton implementation for managing
 * database connections and executing SQL queries. It includes methods for
 * establishing connections, executing queries, and handling database resources.
 *
 * <p>This class uses a double-checked locking mechanism to ensure that the
 * singleton instance is lazily initialized in a thread-safe manner. It also
 * provides utility methods for executing SQL queries, retrieving results, and
 * managing database connections.</p>
 *
 * <h2>Features:</h2>
 * <ul>
 *   <li>Thread-safe singleton instance management.</li>
 *   <li>Lazy initialization of database connections.</li>
 *   <li>Utility methods for executing SQL queries and retrieving results.</li>
 *   <li>Automatic resource management using try-with-resources.</li>
 *   <li>Support for parameterized SQL queries.</li>
 *   <li>Logging of errors and warnings using SLF4J.</li>
 * </ul>
 *
 * <h2>Usage:</h2>
 * <pre>{@code
 * Db db = Db.getInstance();
 * Optional<String> result = db.selectSingleValue("SELECT name FROM users WHERE id = ?", 1);
 * }</pre>
 *
 * <h2>Thread Safety:</h2>
 * <p>The `Db` class is designed to be thread-safe. The singleton instance is
 * initialized using a double-checked locking mechanism, and the database
 * connection is lazily initialized in a synchronized block.</p>
 *
 * <h2>Logging:</h2>
 * <p>All errors and warnings are logged using the SLF4J logging framework. This
 * ensures that any issues with database operations are recorded for debugging
 * and troubleshooting purposes.</p>
 *
 * <h2>Note:</h2>
 * <p>Ensure that the database connection details are correctly configured in
 * the environment variables before using this class.</p>
 */
public class Db {

  private static volatile Db theGlobalInstance;

  public static Db getInstance() throws SQLException {
    if (theGlobalInstance == null) {
      synchronized (Db.class) {
        if (theGlobalInstance == null) {
          theGlobalInstance = new Db();
        }
      }
    }
    return theGlobalInstance;
  }

  public static void teardown() {
    if (theGlobalInstance != null) {
      theGlobalInstance.close();
      theGlobalInstance = null;
    }
  }

  private Connection connection;
  private Logger log;

  protected Db() throws SQLException {
    this.log = LoggerFactory.getLogger(Db.class);
    try {
      connection = connect();
    } catch (SQLException e) {
      log.warn(
        "No connection currently available - will retry next query: " +
        e.getMessage()
      );
    }
  }

  /**
   * Ensures that a database connection is established and returns it.
   * This method uses a double-checked locking mechanism to lazily initialize
   * the connection in a thread-safe manner.
   *
   * @return The established database connection.
   * @throws SQLException If a database access error occurs or the connection
   *                      cannot be established.
   */
  protected Connection connectionRequired() throws SQLException {
    if (connection == null) {
      synchronized (this) {
        if (connection == null) {
          connection = connect();
        }
      }
    }
    return connection;
  }

  /**
   * Executes a SQL query with the provided parameters and returns the result as a list of rows.
   * Each row is represented as a list of objects, where each object corresponds to a column value.
   *
   * @param sql    The SQL query to execute.
   * @param params The parameters to bind to the query placeholders.
   * @return A list of rows, where each row is a list of column values, or {@code null} if an error occurs.
   * @throws SQLException If an error occurs while preparing or executing the query.
   */
  public List<List<Object>> select(String sql, Object... params) {
    try (var stmt = prepareStatement(sql, params)) {
      try (var rs = stmt.executeQuery()) {
        var columns = rs.getMetaData().getColumnCount();
        var rows = new ArrayList<List<Object>>();
        while (rs.next()) {
          var row = new ArrayList<Object>(columns);
          for (int i = 1; i <= columns; i++) {
            row.add(rs.getObject(i));
          }
          rows.add(row);
        }
        return rows;
      }
    } catch (SQLException e) {
      log.error("Error executing query [" + sql + "]", e);
    }
    return null;
  }

  public List<Map<String, Object>> selectRecords(String sql, Object... params) {
    try (var stmt = prepareStatement(sql, params)) {
      try (var rs = stmt.executeQuery()) {
        var columns = rs.getMetaData().getColumnCount();
        var rows = new ArrayList<Map<String, Object>>();
        while (rs.next()) {
          var record = new java.util.HashMap<String, Object>(columns);
          for (int i = 1; i <= columns; i++) {
            record.put(rs.getMetaData().getColumnName(i), rs.getObject(i));
          }
          rows.add(record);
        }
        return rows;
      }
    } catch (SQLException e) {
      log.error("Error executing query [" + sql + "]", e);
    }
    return null;
  }

  /**
   * Executes a SQL query and retrieves a single value from the result set.
   *
   * @param sql    The SQL query to execute.
   * @param params The parameters to be set in the prepared statement.
   * @return An {@link Optional} containing the single value retrieved from the
   *         first column of the first row in the result set, or an empty
   *         {@link Optional} if no rows are returned or an error occurs.
   */

  /**
   * Executes a SQL query and retrieves a single value from the result set.
   *
   * @param <T>    The type of the value to be returned.
   * @param sql    The SQL query to execute.
   * @param params The parameters to be set in the prepared statement.
   * @return The single value retrieved from the first column of the first row
   *         in the result set, or {@code null} if no rows are returned or an
   *         error occurs.
   * @throws ClassCastException if the retrieved value cannot be cast to the specified type {@code T}.
   */
  @SuppressWarnings("unchecked")
  public <T> Optional<T> selectSingleValue(String sql, Object... params) {
    try (var stmt = prepareStatement(sql, params)) {
      try (var rs = stmt.executeQuery()) {
        if (rs.next()) {
          return Optional.ofNullable((T) rs.getObject(1));
        }
      }
    } catch (SQLException e) {
      log.error("Error executing query [" + sql + "]", e);
    }
    return Optional.empty();
  }

  /**
   * Executes the given SQL query and retrieves a single row of results as a list of objects.
   *
   * @param sql The SQL query to execute.
   * @param params The parameters to bind to the query placeholders.
   * @return A list of objects representing the values of the columns in the first row of the result set,
   *         or {@code null} if the query returns no rows or an error occurs.
   * @throws SQLException if a database access error occurs while preparing or executing the statement.
   */
  public List<Object> selectSingleRow(String sql, Object... params) {
    try (var stmt = prepareStatement(sql, params)) {
      try (var rs = stmt.executeQuery()) {
        if (!rs.next()) {
          return null;
        }
        var columns = rs.getMetaData().getColumnCount();
        var row = new ArrayList<Object>(columns);
        for (int i = 1; i <= columns; i++) {
          row.add(rs.getObject(i));
        }
        return row;
      }
    } catch (SQLException e) {
      log.error("Error executing query [" + sql + "]", e);
    }
    return null;
  }

  /**
   * Executes an SQL statement with the provided parameters and returns the number of rows affected.
   *
   * @param sql The SQL query to execute. It may contain placeholders for parameters.
   * @param params The parameters to bind to the placeholders in the SQL query.
   * @return The number of rows affected by the SQL statement, or {@code null} if an error occurs.
   * @throws SQLException if a database access error occurs or the SQL statement is invalid.
   */
  public Integer executeUpdate(String sql, Object... params) {
    try (var stmt = prepareStatement(sql, params)) {
      return stmt.executeUpdate();
    } catch (SQLException e) {
      log.error("Error executing query [" + sql + "]", e);
    }
    return 0;
  }

  /**
   * Prepares a SQL statement with the given query and parameters.
   *
   * @param sql    The SQL query to be prepared.
   * @param params The parameters to be set in the prepared statement. Each parameter
   *               is set in the order they appear in the array, starting from index 0.
   * @return A {@link PreparedStatement} object with the SQL query and parameters set.
   * @throws SQLException If a database access error occurs or the connection is invalid.
   */
  protected PreparedStatement prepareStatement(String sql, Object... params)
    throws SQLException {
    return prepareStatement(java.sql.Statement.NO_GENERATED_KEYS, sql, params);
  }

  /**
   * Prepares a SQL statement with the specified SQL string and parameters.
   * This method allows for the inclusion of auto-generated keys and supports
   * parameterized queries to prevent SQL injection.
   *
   * @param autoGeneratedKeys A flag indicating whether auto-generated keys
   *                          should be returned. Use constants such as
   *                          {@link java.sql.Statement#RETURN_GENERATED_KEYS}.
   * @param sql               The SQL query string to be prepared.
   * @param params            The parameters to be set in the prepared statement.
   *                          These will be bound to the placeholders in the SQL
   *                          query in the order they are provided.
   * @return A {@link PreparedStatement} object that represents the precompiled
   *         SQL statement with the specified parameters set.
   * @throws SQLException If a database access error occurs or the SQL string
   *                      is invalid.
   */
  protected PreparedStatement prepareStatement(
    int autoGeneratedKeys,
    String sql,
    Object... params
  ) throws SQLException {
    var stmt = connection.prepareStatement(sql, autoGeneratedKeys);
    for (int i = 0; i < params.length; i++) {
      if (params[i] instanceof List) {
        var list = (List<?>) params[i];
        Array array = connection.createArrayOf(
          "text",
          list.toArray(new String[0])
        );
        stmt.setArray(i + 1, array);
        continue;
      }
      stmt.setObject(i + 1, params[i]);
    }
    return stmt;
  }

  /**
   * Executes an SQL INSERT statement with the provided parameters and returns the generated key.
   *
   * @param sq The SQL INSERT statement to execute.
   * @param params The parameters to bind to the SQL statement.
   * @return The generated key from the inserted row, or {@code null} if no key was generated or an error occurred.
   * @throws SQLException If a database access error occurs or the SQL statement is invalid.
   */
  public Integer insertAndGetGeneratedKeys(String sq, Object... params) {
    try (
      var stmt = prepareStatement(
        java.sql.Statement.RETURN_GENERATED_KEYS,
        sq,
        params
      )
    ) {
      var affectedRows = stmt.executeUpdate();
      // Check if a row was inserted
      if (affectedRows > 0) {
        // Retrieve the generated key
        try (var rs = stmt.getGeneratedKeys()) {
          if (rs.next()) {
            return rs.getInt(1); // Return the generated key
          }
        }
      }
    } catch (SQLException e) {
      log.error("Error executing query [" + sq + "]", e);
    }
    return null;
  }

  /**
   * Closes the database connection if it is open.
   * Ensures that the connection is set to null after closing.
   * If an SQLException occurs during the closing process,
   * an error message is printed to the console.
   */
  public void close() {
    if (connection != null) {
      synchronized (this) {
        if (connection == null) {
          return;
        }
        try {
          connection.close();
        } catch (SQLException e) {
          log.error("Error closing database connection.", e);
        } finally {
          connection = null;
        }
      }
    }
  }

  /**
   * Establishes a connection to the database using the JDBC URL provided by the environment variables.
   *
   * @return A {@link Connection} object representing the connection to the database.
   * @throws SQLException If a database access error occurs or the connection cannot be established.
   *
   * This method retrieves the database URL from the environment variables and attempts to establish
   * a connection using the {@link DriverManager#getConnection(String)} method. If the connection is
   * successful, it prints the database product version to the console. In case of an error, it closes
   * the connection (if initialized) and logs the error details to the console.
   */
  static Connection connect() throws SQLException {
    Connection conn = null;
    try {
      var sql = EnvVars.getInstance().getDb();
      var props = new java.util.Properties();
      props.setProperty("user", sql.getUser());
      props.setProperty("password", sql.getPassword());
      conn = DriverManager.getConnection(sql.getUrl(), props);
      Colors.Set(c -> c.CYAN);
      System.out.println(conn.getMetaData().getDatabaseProductVersion());
      Colors.Reset();
    } catch (SQLException e) {
      if (conn != null) {
        conn.close();
      }
      LoggerFactory.getLogger(Db.class).error(
        "Error connecting to database: ",
        e
      );
    }

    return conn;
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
    return getFromStateBag(stateBag, fieldName, "");
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

  public static Boolean saveFromStateBag(
    Map<String, Object> stateBag,
    String fieldName,
    Consumer<String> setter
  ) {
    return saveFromStateBag(stateBag, fieldName, setter, "");
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
    Consumer<String> setter,
    String defaultValue
  ) {
    Boolean ret = true;
    var v = getFromStateBag(stateBag, fieldName, NO_VALUE);
    if (v == NO_VALUE) {
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
    return saveFromStateBag(stateBag, fieldName, setter, 0);
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
    var v1 = getFromStateBag(stateBag, fieldName, NO_VALUE);
    if (v1 == NO_VALUE) {
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
    return saveFromStateBag(stateBag, fieldName, setter, Double.valueOf(0));
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
    var v1 = getFromStateBag(stateBag, fieldName, NO_VALUE);
    if (v1 == NO_VALUE) {
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
      value = OffsetDateTime.parse(
        v1.toString(),
        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSSSS").withZone(
          java.time.ZoneOffset.UTC
        )
      );
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
      if (v1 instanceof String[]) {
        value = List.of((String[]) v1);
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
      value = ((java.sql.Timestamp) v1).toInstant()
        .atZone(java.time.ZoneId.systemDefault())
        .toLocalDateTime();
    } catch (Exception e) {
      value = LocalDateTime.parse(
        v1.toString(),
        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSSSS")
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

  private static final String NO_VALUE = "__no-value__";
}
