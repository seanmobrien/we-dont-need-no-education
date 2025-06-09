package com.obapps.schoolchatbot.core.models;

import static org.junit.jupiter.api.Assertions.*;

import com.obapps.core.util.Db;
import java.sql.SQLException;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class EmailAttachmentTest {

  @Test
  void testEmailAttachmentCreation() {
    EmailAttachment attachment = new EmailAttachment(
      1,
      "file.txt",
      "/path/to/file.txt",
      "email123",
      "text/plain",
      1024
    );
    assertNotNull(attachment);
    assertEquals(1, attachment.getAttachmentId());
    assertEquals("file.txt", attachment.getFileName());
    assertEquals("/path/to/file.txt", attachment.getFilePath());
    assertEquals("email123", attachment.getEmailId());
    assertEquals("text/plain", attachment.getMimeType());
    assertEquals(1024, attachment.getSize());
  }

  @Test
  void testToJson() {
    EmailAttachment attachment = new EmailAttachment(
      1,
      "file.txt",
      "/path/to/file.txt",
      "email123",
      "text/plain",
      1024
    );
    String json = attachment.toJson();
    assertNotNull(json);
    assertTrue(json.contains("file.txt"));
  }

  @Test
  void testSaveToDb() throws SQLException {
    Db mockDb = Mockito.mock(Db.class);
    Mockito.when(
      mockDb.insertAndGetGeneratedKeys(
        Mockito.anyString(),
        Mockito.any(),
        Mockito.any(),
        Mockito.any(),
        Mockito.any(),
        Mockito.any(),
        Mockito.any(),
        Mockito.any(),
        Mockito.any(),
        Mockito.any()
      )
    ).thenReturn(1);

    EmailAttachment attachment = new EmailAttachment(
      null,
      "file.txt",
      "/path/to/file.txt",
      "email123",
      "text/plain",
      1024
    );
    attachment.saveToDb(mockDb);

    assertNotNull(attachment.getAttachmentId());
    assertEquals(1, attachment.getAttachmentId());
  }

  @Test
  void testUpdateDb() throws SQLException {
    Db mockDb = Mockito.mock(Db.class);

    EmailAttachment attachment = new EmailAttachment(
      1,
      "file.txt",
      "/path/to/file.txt",
      "email123",
      "text/plain",
      1024
    );
    attachment.updateDb(mockDb);

    Mockito.verify(mockDb).executeUpdate(
      Mockito.anyString(),
      Mockito.any(),
      Mockito.any(),
      Mockito.any(),
      Mockito.any(),
      Mockito.any(),
      Mockito.any(),
      Mockito.any(),
      Mockito.any(),
      Mockito.any(),
      Mockito.any()
    );
  }

  @Test
  void testLoadForEmail() throws SQLException {
    Db mockDb = Mockito.mock(Db.class);
    UUID emailId = UUID.fromString("c5edc12e-5d17-481e-ac1f-2cfa8d007b5d");
    Mockito.when(
      mockDb.selectObjects(
        Mockito.eq(EmailAttachment.class),
        Mockito.anyString(),
        Mockito.any()
      )
    ).thenReturn(List.of(new EmailAttachment()));
    
    List<EmailAttachment> attachments = EmailAttachment.loadForEmail(
      mockDb,
      emailId
    );
    assertNotNull(attachments);
    assertFalse(attachments.isEmpty());
  }

  @Test
  void testLoadFromDb() throws SQLException {
    Db mockDb = Mockito.mock(Db.class);
    Mockito.when(
      mockDb.selectObjects(
        Mockito.eq(EmailAttachment.class),
        Mockito.anyString(),
        Mockito.any()
      )
    ).thenReturn(
      List.of(
        new EmailAttachment(
          1,
          "file.txt",
          "/path/to/file.txt",
          "email123",
          "text/plain",
          1024
        )
      )
    );

    EmailAttachment attachment = EmailAttachment.loadFromDb(mockDb, 1);
    assertNotNull(attachment);
    assertEquals(1, attachment.getAttachmentId());
  }
}
