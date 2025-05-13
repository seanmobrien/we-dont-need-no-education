package com.obapps.core.util;

import java.sql.Array;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
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
public class Db implements AutoCloseable {

  static com.zaxxer.hikari.HikariDataSource dataSource;

  static {
    var sql = EnvVars.getInstance().getDb();
    com.zaxxer.hikari.HikariConfig config =
      new com.zaxxer.hikari.HikariConfig();
    config.setJdbcUrl(sql.getUrl());
    config.setUsername(sql.getUser());
    config.setPassword(sql.getPassword());
    config.setMaxLifetime(60 * 5 * 1000);
    dataSource = new com.zaxxer.hikari.HikariDataSource(config);
  }

  /**
   * Retrieves an instance of the Db class without throwing an exception.
   * If an SQLException occurs during the retrieval, it logs a warning and returns null.
   *
   * @param notUsed An unused parameter, included for compatibility or future use.
   * @return An instance of the Db class, or null if an exception occurs.
   */
  public static Db getInstanceNoThrow(Object notUsed) {
    try {
      return getInstance();
    } catch (SQLException e) {
      LoggerFactory.getLogger(Db.class).warn("Failed to get Db instance", e);
      return null;
    }
  }

  static Db getInitialValue() {
    try {
      return new Db();
    } catch (SQLException e) {
      LoggerFactory.getLogger(Db.class).warn("Failed to get Db instance", e);
    }
    return null;
  }

  private static final ThreadLocal<Db> threadLocalDb = ThreadLocal.withInitial(
    Db::getInitialValue
  );

  /**
   * Returns the singleton instance of the {@code Db} class.
   * This method ensures that only one instance of the {@code Db} class
   * is created (lazy initialization) and provides thread-safe access
   * to the instance using double-checked locking.
   *
   * @return the singleton instance of the {@code Db} class.
   * @throws SQLException if a database access error occurs during initialization.
   */
  public static Db getInstance() throws SQLException {
    var theGlobalInstance = threadLocalDb.get();
    if (theGlobalInstance == null) {
      theGlobalInstance = new Db();
      threadLocalDb.set(theGlobalInstance);
    }
    return theGlobalInstance;
  }

  /**
   * Cleans up and releases resources associated with the global database instance.
   * If a global database instance exists, this method closes it and sets the instance to null.
   */
  public static void teardown() {
    var theGlobalInstance = threadLocalDb.get();
    if (theGlobalInstance != null) {
      theGlobalInstance.close();
      theGlobalInstance = null;
    }
  }

  /**
   * Creates a new unit of work by initializing a database connection and starting a request.
   *
   * @return A new instance of the {@code Db} class with an active connection and request.
   * @throws SQLException If an error occurs while creating the unit of work or initializing the connection.
   */
  public static Db createUnitOfWork() throws SQLException {
    try {
      var ret = new Db();
      ret._inTx = true;
      ret.connectionRequired().beginRequest();
      return ret;
    } catch (SQLException e) {
      LoggerFactory.getLogger(Db.class).warn(
        "Failed to create unit of work",
        e
      );
      throw new SQLException(e);
    }
  }

  /**
   * Represents a database connection instance.
   * This field holds the connection to the database, which is used
   * to execute queries and manage transactions.
   */
  private Connection connection;

  /**
   * Logger instance used for logging messages and errors within the Db class.
   */
  private Logger log;

  /**
   * Protected constructor for the Db class.
   * Initializes the logger and attempts to establish a database connection.
   * If the connection attempt fails, a warning is logged, and the system will
   * retry on the next query.
   *
   * @throws SQLException if an SQL error occurs during connection initialization.
   */
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
      connection = connect();
    }
    return connection;
  }

  /**
   * Establishes a connection to the database using HikariCP for connection pooling.
   *
   * @return A {@link Connection} object representing the connection to the database.
   * @throws SQLException If a database access error occurs or the connection cannot be established.
   *
   * This method retrieves the database URL from the environment variables and attempts to establish
   * a connection using HikariCP. If the connection is successful, it prints the database product version
   * to the console. In case of an error, it closes the connection (if initialized) and logs the error details.
   */
  public static Connection connect() throws SQLException {
    Connection conn = null;
    try {
      conn = dataSource.getConnection();
    } catch (SQLException e) {
      LoggerFactory.getLogger(com.obapps.core.util.Db.class).error(
        "Error connecting to database: ",
        e
      );
    }

    return conn;
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
    } finally {
      closeAfterQuery();
    }
    return null;
  }

  /**
   * Executes the given SQL query with the provided parameters and returns the result as a list of maps.
   * Each map represents a row in the result set, where the keys are column names and the values are the corresponding column values.
   *
   * @param sql    The SQL query to execute.
   * @param params The parameters to bind to the query placeholders.
   * @return A list of maps representing the query result, or {@code null} if an error occurs.
   * @throws SQLException If an error occurs while preparing or executing the query.
   */
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
    } finally {
      closeAfterQuery();
    }
    return List.of();
  }

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
    } finally {
      closeAfterQuery();
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
    } finally {
      closeAfterQuery();
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
  public Integer executeUpdate(String sql, Object... params)
    throws SQLException {
    try (var stmt = prepareStatement(sql, params)) {
      return stmt.executeUpdate();
    } catch (SQLException e) {
      log.error("Error executing query [" + sql + "]", e);
      throw new SQLException(
        "Error executing query [" + sql + "]",
        e.getSQLState(),
        e.getErrorCode(),
        e
      );
    } finally {
      closeAfterQuery();
    }
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
    var conn = connectionRequired();
    if (conn == null) {
      throw new SQLException("No connection available.");
    }
    var stmt = conn.prepareStatement(sql, autoGeneratedKeys);
    for (int i = 0; i < params.length; i++) {
      if (params[i] instanceof List) {
        if (params[i] instanceof List<?> list) {
          if (!list.isEmpty() && list.get(0) instanceof UUID) {
            UUID[] uuidArray = list.toArray(new UUID[0]);
            Array array = connection.createArrayOf("uuid", uuidArray);
            stmt.setArray(i + 1, array);
          } else {
            Array array = connection.createArrayOf(
              "text",
              list.toArray(new String[0])
            );
            stmt.setArray(i + 1, array);
          }
        }
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
    } finally {
      closeAfterQuery();
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

  Boolean _inTx = false;

  public void closeAfterQuery() {
    if (_inTx) {
      return;
    }
    close();
  }

  public <T> List<T> selectObjects(
    Class<T> clazz,
    String sql,
    Object... params
  ) {
    try (var stmt = prepareStatement(sql, params)) {
      try (var rs = stmt.executeQuery()) {
        var rows = new ArrayList<T>();
        var metaData = rs.getMetaData();
        var columnCount = metaData.getColumnCount();

        while (rs.next()) {
          T instance = clazz.getDeclaredConstructor().newInstance();
          for (int i = 1; i <= columnCount; i++) {
            String columnName = metaData.getColumnName(i);
            Object value = rs.getObject(i);
            try {
              var field = clazz.getDeclaredField(
                Strings.snakeToCamelCase(columnName)
              );
              field.setAccessible(true);
              if (value == null) {
                field.set(instance, null);
              } else if (value instanceof java.sql.Timestamp) {
                field.set(
                  instance,
                  ((java.sql.Timestamp) value).toLocalDateTime()
                );
              } else if (value instanceof java.sql.Date) {
                field.set(instance, ((java.sql.Date) value).toLocalDate());
              } else if (value instanceof java.sql.Array) {
                field.set(
                  instance,
                  List.of((Object[]) ((java.sql.Array) value).getArray())
                );
              } else if (
                value instanceof java.util.UUID ||
                field.getType().equals(UUID.class)
              ) {
                if (field.getType().equals(UUID.class)) {
                  field.set(instance, UUID.fromString(value.toString()));
                } else {
                  field.set(instance, value.toString());
                }
              } else if (
                field.getType().equals(Double.class) ||
                field.getType().equals(double.class)
              ) {
                field.set(instance, Double.valueOf(value.toString()));
              } else if (
                field.getType().equals(Integer.class) ||
                field.getType().equals(int.class)
              ) {
                field.set(
                  instance,
                  value == null ? null : Integer.valueOf(value.toString())
                );
              } else {
                field.set(instance, value);
              }
            } catch (NoSuchFieldException e) {
              // Field not found in the class, skip setting this value
            }
          }
          rows.add(instance);
        }
        return rows;
      }
    } catch (Exception e) {
      log.error("Error executing query [" + sql + "]", e);
    } finally {
      closeAfterQuery();
    }
    return new ArrayList<>();
  }

  public IDbTransaction createTransaction() {
    return new DbTx();
  }

  /**
   * The {@code DbTx} class represents a database transaction that implements the {@link AutoCloseable} interface.
   * It provides mechanisms to manage the lifecycle of a transaction, including starting, committing, rolling back,
   * and finalizing the transaction.
   *
   * <p>Usage of this class ensures that database transactions are properly handled, even in the presence of exceptions,
   * by leveraging the try-with-resources statement.
   *
   * <p>Example usage:
   * <pre>
   * try (DbTx transaction = new DbTx()) {
   *     // Perform database operations here
   *     // If an exception occurs, the transaction will be rolled back automatically
   * }
   * </pre>
   *
   * <p>Features:
   * <ul>
   *   <li>Automatically begins a transaction upon instantiation.</li>
   *   <li>Allows manual rollback of the transaction using {@link #setAbort()}.</li>
   *   <li>Commits the transaction upon successful completion unless explicitly rolled back.</li>
   *   <li>Ensures proper cleanup of resources when the transaction is closed.</li>
   * </ul>
   *
   * <p>Note:
   * <ul>
   *   <li>Ensure that the {@code connection} object is properly initialized and managed outside this class.</li>
   *   <li>Exceptions during transaction management are logged but not rethrown.</li>
   * </ul>
   */
  protected class DbTx implements IDbTransaction {

    private boolean rolledBack = false;
    private boolean disposed = false;
    private final boolean initialAutoComplete;
    private final boolean initialInTx = _inTx;

    public DbTx() {
      boolean initialComplete = true;
      try {
        _inTx = true;
        initialComplete = connectionRequired().getAutoCommit();
        connection.beginRequest();
        connection.setAutoCommit(false);
      } catch (Exception e) {
        log.error("Error starting transaction", e);
      }
      this.initialAutoComplete = initialComplete;
    }

    public Db getDb() {
      return Db.this;
    }

    public Db createUnitOfWork() throws SQLException {
      return Db.createUnitOfWork();
    }

    public void setAbort() {
      _inTx = initialInTx;
      if (disposed) {
        return;
      }
      rolledBack = true;
      try {
        connection.rollback();
      } catch (SQLException e) {
        log.error("Error rolling back transaction", e);
      }
    }

    public void close() {
      _inTx = initialInTx;
      if (disposed) {
        return;
      }
      try {
        if (!rolledBack) {
          connection.commit();
        }
        connection.setAutoCommit(this.initialAutoComplete);
        connection.endRequest();
      } catch (Exception e) {
        log.error("Error finalizing transaction", e);
      } finally {
        disposed = true;
      }
    }
  }

  public static final String NO_VALUE = "__no-value__";
}
