package com.obapps.core.util;

import java.sql.SQLException;

/**
 * Represents a database transaction that can be managed programmatically.
 * This interface extends {@link AutoCloseable}, allowing the transaction
 * to be closed automatically in a try-with-resources block.
 */
public interface IDbTransaction extends AutoCloseable {
  /**
   * Retrieves the database instance associated with the current transaction.
   *
   * @return the {@link Db} instance representing the database.
   */
  public Db getDb();

  /**
   * Returns a secondary database connection that is running outside of the current transaction scope.
   * This is useful for performing operations that should not be part of the current transaction.
   * For example, if you need to perform a read operation while the current transaction is in progress,
   * you can use this method to get a separate connection.
   * @return
   */
  public Db createUnitOfWork() throws SQLException;

  /**
   * Marks the current database transaction to be aborted.
   * Once this method is called, the transaction will not be committed
   * and any changes made during the transaction will be rolled back.
   */
  public void setAbort();
}
