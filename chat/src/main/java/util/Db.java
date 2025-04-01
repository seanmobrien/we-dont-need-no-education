package util;

import data.Colors;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
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
}
