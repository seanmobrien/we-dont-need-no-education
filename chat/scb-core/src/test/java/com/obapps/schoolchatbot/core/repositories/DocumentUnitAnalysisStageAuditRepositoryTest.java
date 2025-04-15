package com.obapps.schoolchatbot.core.repositories;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

import com.obapps.core.util.Db;
import com.obapps.schoolchatbot.core.models.DocumentUnitAnalysisStageAudit;
import java.sql.SQLException;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

public class DocumentUnitAnalysisStageAuditRepositoryTest {

  private DocumentUnitAnalysisStageAuditRepository repository;
  private Db mockDb;

  @BeforeEach
  public void setUp() throws SQLException {
    mockDb = mock(Db.class);
    repository = new DocumentUnitAnalysisStageAuditRepository(mockDb);
  }

  @Test
  public void testFindByDocumentId_withValidDocumentId() throws SQLException {
    Integer documentId = 98;

    DocumentUnitAnalysisStageAudit mockAudit = mock(
      DocumentUnitAnalysisStageAudit.class
    );
    when(
      mockDb.selectObjects(
        eq(DocumentUnitAnalysisStageAudit.class),
        eq(
          "SELECT * FROM document_unit_analysis_stage_audit WHERE document_id = ?"
        ),
        eq(documentId)
      )
    ).thenReturn(List.of(mockAudit));

    List<DocumentUnitAnalysisStageAudit> result = repository.findByDocumentId(
      documentId
    );

    assertThat(result).isNotNull().hasSize(1).contains(mockAudit);
    verify(mockDb, times(1)).selectObjects(
      eq(DocumentUnitAnalysisStageAudit.class),
      eq(
        "SELECT * FROM document_unit_analysis_stage_audit WHERE document_id = ?"
      ),
      eq(documentId)
    );
  }

  @Test
  public void testFindByDocumentId_withNoMatchingEntries() throws SQLException {
    Integer documentId = 1;
    when(
      mockDb.selectObjects(
        eq(DocumentUnitAnalysisStageAudit.class),
        eq(
          "SELECT * FROM document_unit_analysis_stage_audit WHERE document_id = ?"
        ),
        eq(documentId)
      )
    ).thenReturn(List.of());

    List<DocumentUnitAnalysisStageAudit> result = repository.findByDocumentId(
      documentId
    );

    assertThat(result).isNotNull().isEmpty();
    verify(mockDb, times(1)).selectObjects(
      eq(DocumentUnitAnalysisStageAudit.class),
      eq(
        "SELECT * FROM document_unit_analysis_stage_audit WHERE document_id = ?"
      ),
      eq(documentId)
    );
  }

  @Test
  public void testSave_withSQLException() throws SQLException {
    DocumentUnitAnalysisStageAudit mockAudit = mock(
      DocumentUnitAnalysisStageAudit.class
    );
    doThrow(new SQLException("Database error"))
      .when(mockAudit)
      .saveToDb(mockDb);

    assertThatThrownBy(() -> repository.save(mockAudit))
      .isInstanceOf(SQLException.class)
      .hasMessageContaining("Database error");

    verify(mockAudit, times(1)).saveToDb(mockDb);
  }
}
