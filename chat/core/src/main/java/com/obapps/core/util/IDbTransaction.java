package com.obapps.core.util;

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
   * Marks the current database transaction to be aborted.
   * Once this method is called, the transaction will not be committed
   * and any changes made during the transaction will be rolled back.
   */
  public void setAbort();
}
