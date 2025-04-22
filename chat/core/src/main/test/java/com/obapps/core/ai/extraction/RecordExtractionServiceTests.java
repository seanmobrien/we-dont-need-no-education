package com.obapps.core.ai.extraction;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.obapps.core.ai.extraction.models.*;
import com.obapps.core.ai.extraction.services.RecordExtractionService;
import dev.langchain4j.model.output.TokenUsage;
import dev.langchain4j.service.Result;
import java.util.ArrayList;
import java.util.List;
import java.util.function.BiConsumer;
import java.util.function.Function;
import org.junit.jupiter.api.Test;

public class RecordExtractionServiceTests {

  @Test
  void testExtractRecordsSingleIteration() {
    RecordExtractionService<String> service = new RecordExtractionService<>();

    Function<Object, Result<IRecordExtractionEnvelope<String>>> firstCallback =
      mock(Function.class);
    Function<
      Object,
      Result<IRecordExtractionEnvelope<String>>
    > continueCallback = mock(Function.class);

    IRecordExtractionEnvelope<String> envelope = mock(
      IRecordExtractionEnvelope.class
    );
    when(envelope.getResults()).thenReturn(List.of("record1", "record2"));
    when(envelope.getAllRecordsEmitted()).thenReturn(true);

    Result<IRecordExtractionEnvelope<String>> result = mock(Result.class);
    when(result.content()).thenReturn(envelope);
    when(result.tokenUsage()).thenReturn(mock(TokenUsage.class));
    when(firstCallback.apply(any())).thenReturn(result);

    Result<List<String>> finalResult = service.extractRecords(
      new Object(),
      firstCallback,
      continueCallback
    );

    assertNotNull(finalResult);
    assertEquals(2, finalResult.content().size());
    assertTrue(finalResult.content().contains("record1"));
    assertTrue(finalResult.content().contains("record2"));
  }

  @Test
  void testExtractRecordsMultipleIterations() {
    RecordExtractionService<String> service = new RecordExtractionService<>();

    Function<Object, Result<IRecordExtractionEnvelope<String>>> firstCallback =
      mock(Function.class);
    Function<
      Object,
      Result<IRecordExtractionEnvelope<String>>
    > continueCallback = mock(Function.class);

    IRecordExtractionEnvelope<String> firstEnvelope = mock(
      IRecordExtractionEnvelope.class
    );
    when(firstEnvelope.getResults()).thenReturn(List.of("record1"));
    when(firstEnvelope.getAllRecordsEmitted()).thenReturn(false);

    IRecordExtractionEnvelope<String> secondEnvelope = mock(
      IRecordExtractionEnvelope.class
    );
    when(secondEnvelope.getResults()).thenReturn(List.of("record2"));
    when(secondEnvelope.getAllRecordsEmitted()).thenReturn(true);

    Result<IRecordExtractionEnvelope<String>> firstResult = mock(Result.class);
    when(firstResult.content()).thenReturn(firstEnvelope);
    when(firstResult.tokenUsage()).thenReturn(mock(TokenUsage.class));

    Result<IRecordExtractionEnvelope<String>> secondResult = mock(Result.class);
    when(secondResult.content()).thenReturn(secondEnvelope);
    when(secondResult.tokenUsage()).thenReturn(mock(TokenUsage.class));

    when(firstCallback.apply(any())).thenReturn(firstResult);
    when(continueCallback.apply(any())).thenReturn(secondResult);

    Result<List<String>> finalResult = service.extractRecords(
      new Object(),
      firstCallback,
      continueCallback
    );

    assertNotNull(finalResult);
    assertEquals(2, finalResult.content().size());
    assertTrue(finalResult.content().contains("record1"));
    assertTrue(finalResult.content().contains("record2"));
  }

  @Test
  void testExtractRecordsWithIterationProcessedCallback() {
    RecordExtractionService<String> service = new RecordExtractionService<>();

    Function<Object, Result<IRecordExtractionEnvelope<String>>> firstCallback =
      mock(Function.class);
    Function<
      Object,
      Result<IRecordExtractionEnvelope<String>>
    > continueCallback = mock(Function.class);
    BiConsumer<
      Object,
      IterationEventArgs<String, IRecordExtractionEnvelope<String>>
    > onIterationProcessed = mock(BiConsumer.class);

    IRecordExtractionEnvelope<String> envelope = mock(
      IRecordExtractionEnvelope.class
    );
    when(envelope.getResults()).thenReturn(List.of("record1"));
    when(envelope.getAllRecordsEmitted()).thenReturn(true);

    Result<IRecordExtractionEnvelope<String>> result = mock(Result.class);
    when(result.content()).thenReturn(envelope);
    when(result.tokenUsage()).thenReturn(mock(TokenUsage.class));
    when(firstCallback.apply(any())).thenReturn(result);

    Result<List<String>> finalResult = service.extractRecords(
      new Object(),
      firstCallback,
      continueCallback,
      onIterationProcessed
    );

    assertNotNull(finalResult);
    assertEquals(1, finalResult.content().size());
    assertTrue(finalResult.content().contains("record1"));
    verify(onIterationProcessed, times(1)).accept(any(), any());
  }

  @Test
  void testGetIterationThrowsExceptionForInvalidContent() {
    RecordExtractionService<String> service = new RecordExtractionService<>();

    Result<?> result = mock(Result.class);
    when(result.content()).thenReturn(null);

    IllegalArgumentException exception = assertThrows(
      IllegalArgumentException.class,
      () -> {
        service.extractRecords(new Object(), s -> result, s -> result);
      }
    );

    assertEquals("Content cannot be null", exception.getMessage());
  }
}
