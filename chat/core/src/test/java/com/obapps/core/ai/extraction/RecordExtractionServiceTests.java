package com.obapps.core.ai.extraction;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.obapps.core.ai.extraction.models.*;
import com.obapps.core.ai.extraction.services.IterationEventArgs;
import com.obapps.core.ai.extraction.services.RecordExtractionService;
import dev.langchain4j.service.Result;
import java.util.ArrayList;
import java.util.List;
import java.util.function.BiConsumer;
import java.util.function.Function;
import org.junit.jupiter.api.Test;

public class RecordExtractionServiceTests {

  @Test
  public void testFactoryMethodOf() {
    Function<Object, Result<IRecordExtractionEnvelope<Object>>> mockExtractor =
      mock(Function.class);
    RecordExtractionService<Object> service = RecordExtractionService.of(
      mockExtractor
    );
    assertNotNull(
      service,
      "Factory method 'of' should return a non-null instance."
    );
  }

  @Test
  public void testExtractRecordsWithValidCallbacks() {
    RecordExtractionService<String> service = new RecordExtractionService<>();

    Function<Object, Result<IRecordExtractionEnvelope<String>>> firstCallback =
      mock(Function.class);
    Function<
      RecordExtractionContext<
        String,
        Object,
        IRecordExtractionEnvelope<String>
      >,
      Result<IRecordExtractionEnvelope<String>>
    > continueCallback = mock(Function.class);
    BiConsumer<
      Object,
      IterationEventArgs<String, IRecordExtractionEnvelope<String>>
    > onIterationProcessed = mock(BiConsumer.class);

    Object mockService = new Object();
    IRecordExtractionEnvelope<String> mockEnvelope = mock(
      IRecordExtractionEnvelope.class
    );
    when(mockEnvelope.getResults()).thenReturn(new ArrayList<>());
    when(mockEnvelope.getAllRecordsEmitted()).thenReturn(true);
    Result<IRecordExtractionEnvelope<String>> mockResult = new Result<>(
      mockEnvelope,
      null,
      null,
      null,
      null
    );
    when(firstCallback.apply(mockService)).thenReturn(mockResult);

    Result<List<String>> result = service.extractRecords(
      mockService,
      firstCallback,
      continueCallback,
      onIterationProcessed
    );

    assertNotNull(result, "Result should not be null.");
    assertTrue(
      result.content().isEmpty(),
      "Extracted records should be empty."
    );
  }

  @Test
  public void testGetIterationWithValidResult() {
    var service = new TestableRecordExtractionService();

    IRecordExtractionEnvelope<String> mockEnvelope = mock(
      IRecordExtractionEnvelope.class
    );
    Result<IRecordExtractionEnvelope<String>> mockResult = new Result<>(
      mockEnvelope,
      null,
      null,
      null,
      null
    );

    IRecordExtractionEnvelope<String> iteration = service.getIterationAccessor(
      mockResult
    );

    assertNotNull(iteration, "Iteration should not be null.");
  }

  class TestableRecordExtractionService
    extends RecordExtractionService<String> {

    public IRecordExtractionEnvelope<String> getIterationAccessor(
      Result<?> result
    ) {
      return super.getIteration(result);
    }
  }
}
