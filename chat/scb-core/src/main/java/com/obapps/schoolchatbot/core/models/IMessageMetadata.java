package com.obapps.schoolchatbot.core.models;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Interface representing metadata for a message.
 * Provides methods to retrieve various properties of a message.
 */
public interface IMessageMetadata {
  /**
   * Gets the unique identifier of the document.
   *
   * @return the document ID as an Integer.
   */
  Integer getDocumentId();

  /**
   * Gets the unique identifier of the email associated with the message.
   *
   * @return the email ID as a UUID.
   */
  UUID getEmailId();

  /**
   * Gets the type of the document.
   *
   * @return the document type as a String.
   */
  String getDocumentType();

  /**
   * Gets the date and time when the document was sent.
   *
   * @return the document send date as a LocalDateTime.
   */
  LocalDateTime getDocumentSendDate();

  /**
   * Indicates whether the message is from a parent.
   *
   * @return true if the message is from a parent, false otherwise.
   */
  Boolean getIsFromParent();

  /**
   * Gets the sender of the message.
   *
   * @return the sender as a String.
   */
  String getSender();

  /**
   * Gets the recipients of the message.
   *
   * @return the recipients as a String.
   */
  String getRecipients();

  /**
   * Gets the subject of the message.
   *
   * @return the subject as a String.
   */
  String getSubject();

  /**
   * Gets the unique identifier of the thread to which the message belongs.
   *
   * @return the thread ID as an Integer.
   */
  Integer getThreadId();
}
